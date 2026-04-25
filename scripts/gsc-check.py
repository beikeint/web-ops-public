#!/usr/bin/env python3
"""
GSC 每日巡检脚本 — 网站运营智能体网站运营-web-ops
用法: python3 gsc-check.py [客户域名]
示例: python3 gsc-check.py demo-c.com
"""

import sys
import json
from datetime import datetime, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build

# === 配置 ===
KEY_FILE = '${GSC_CONFIG_PATH}/example-seo.json'
SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']

# 客户域名映射（新客户加在这里）
CLIENTS = {
    'demo-c.com': {
        'site_url': 'sc-domain:demo-c.com',
        'primary_lang': '/en/',
        'name': 'Demo-C',
    },
}


def get_service():
    credentials = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
    return build('searchconsole', 'v1', credentials=credentials)


def check_search_performance(service, site_url, days=7):
    """最近N天搜索表现"""
    end_date = datetime.now().strftime('%Y-%m-%d')
    start_date = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')

    # 按关键词
    kw_response = service.searchanalytics().query(siteUrl=site_url, body={
        'startDate': start_date,
        'endDate': end_date,
        'dimensions': ['query'],
        'rowLimit': 20,
    }).execute()

    # 按页面
    page_response = service.searchanalytics().query(siteUrl=site_url, body={
        'startDate': start_date,
        'endDate': end_date,
        'dimensions': ['page'],
        'rowLimit': 25,
    }).execute()

    return kw_response.get('rows', []), page_response.get('rows', [])


def check_index_status(service, site_url, urls):
    """检查页面索引状态"""
    indexed = []
    not_found = []
    issues = []

    for url in urls:
        try:
            result = service.urlInspection().index().inspect(
                body={'inspectionUrl': url, 'siteUrl': site_url}
            ).execute()
            idx = result.get('inspectionResult', {}).get('indexStatusResult', {})
            verdict = idx.get('verdict', 'N/A')
            coverage = idx.get('coverageState', 'N/A')
            crawl_time = idx.get('lastCrawlTime', '')

            short = url.split('.net')[1] if '.net' in url else url

            if verdict == 'PASS':
                indexed.append({'url': short, 'crawled': crawl_time[:10] if crawl_time else '-'})
            elif 'unknown' in coverage.lower():
                not_found.append(short)
            else:
                issues.append({'url': short, 'reason': coverage})
        except Exception as e:
            short = url.split('.net')[1] if '.net' in url else url
            issues.append({'url': short, 'reason': str(e)[:80]})

    return indexed, not_found, issues


def compare_with_previous(current_data, history_file):
    """与上次检查结果对比，发现变化"""
    changes = []
    try:
        with open(history_file, 'r') as f:
            previous = json.load(f)

        prev_indexed = set(p['url'] for p in previous.get('indexed', []))
        curr_indexed = set(p['url'] for p in current_data.get('indexed', []))

        newly_indexed = curr_indexed - prev_indexed
        lost_index = prev_indexed - curr_indexed

        for url in newly_indexed:
            changes.append(f"  🎉 新索引: {url}")
        for url in lost_index:
            changes.append(f"  ⚠️ 掉索引: {url}")

    except FileNotFoundError:
        changes.append("  (首次运行，无历史数据可对比)")

    return changes


def main():
    domain = sys.argv[1] if len(sys.argv) > 1 else 'demo-c.com'

    if domain not in CLIENTS:
        print(f"未找到客户: {domain}")
        print(f"已配置客户: {', '.join(CLIENTS.keys())}")
        sys.exit(1)

    client = CLIENTS[domain]
    service = get_service()

    print(f"{'=' * 60}")
    print(f"  GSC 每日巡检 — {client['name']} ({domain})")
    print(f"  检查时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'=' * 60}\n")

    # 1. 搜索表现
    print("📊 最近7天搜索表现")
    print("-" * 60)
    kw_rows, page_rows = check_search_performance(service, client['site_url'], 7)

    total_clicks = sum(r['clicks'] for r in page_rows)
    total_impressions = sum(r['impressions'] for r in page_rows)
    avg_ctr = (total_clicks / total_impressions * 100) if total_impressions > 0 else 0

    print(f"  总点击: {total_clicks}  |  总展示: {int(total_impressions)}  |  CTR: {avg_ctr:.1f}%")

    if kw_rows:
        print(f"\n  Top关键词:")
        for row in kw_rows[:10]:
            q = row['keys'][0][:45]
            print(f"    {q:<47} 展示:{int(row['impressions']):>4}  排名:{row['position']:.1f}")

    # 2. 索引状态（检查主语言页面）
    print(f"\n📋 索引状态检查")
    print("-" * 60)

    # Build URL list from sitemap
    import urllib.request
    import xml.etree.ElementTree as ET

    sitemap_url = f'https://{domain}/sitemap-0.xml'
    req = urllib.request.Request(sitemap_url, headers={'User-Agent': 'Mozilla/5.0'})
    response = urllib.request.urlopen(req)
    tree = ET.parse(response)
    root = tree.getroot()
    ns = {'s': 'http://www.sitemaps.org/schemas/sitemap/0.9'}

    lang = client['primary_lang']
    urls = [u.text for u in root.findall('.//s:url/s:loc', ns) if lang in u.text]

    # Limit to avoid quota issues (2000/day, but inspect is expensive)
    check_urls = urls[:30]

    indexed, not_found, issues = check_index_status(service, client['site_url'], check_urls)

    print(f"  检查页面: {len(check_urls)}个")
    print(f"  ✅ 已索引: {len(indexed)}个")
    print(f"  ⚠️ 未发现: {len(not_found)}个")
    print(f"  ❌ 有问题: {len(issues)}个")
    print(f"  索引率: {len(indexed)}/{len(check_urls)} = {len(indexed)/len(check_urls)*100:.0f}%")

    if not_found:
        print(f"\n  未被Google发现的页面:")
        for u in not_found:
            print(f"    ⚠️ {u}")

    if issues:
        print(f"\n  有索引问题的页面:")
        for item in issues:
            print(f"    ❌ {item['url']} — {item['reason']}")

    # 3. 对比历史
    history_dir = f'${WORKSPACE_ROOT}/智能体/运营/网站运营-web-ops/客户-{client["name"]}/数据'
    history_file = f'{history_dir}/gsc-index-history.json'

    current_data = {'indexed': indexed, 'not_found': not_found, 'issues': issues, 'date': datetime.now().strftime('%Y-%m-%d')}
    changes = compare_with_previous(current_data, history_file)

    print(f"\n📈 与上次对比")
    print("-" * 60)
    for c in changes:
        print(c)

    # Save current data as history
    import os
    os.makedirs(history_dir, exist_ok=True)
    with open(history_file, 'w') as f:
        json.dump(current_data, f, ensure_ascii=False, indent=2)

    # 4. 告警
    print(f"\n🚨 告警")
    print("-" * 60)
    alerts = []
    if len(indexed) / max(len(check_urls), 1) < 0.5:
        alerts.append("索引率低于50%，需要检查sitemap和内链")
    if total_clicks == 0 and total_impressions > 50:
        alerts.append("有展示无点击，需要优化标题和描述")
    if not_found and len(not_found) > len(indexed):
        alerts.append(f"{len(not_found)}个页面未被发现，多于已索引数量")

    if alerts:
        for a in alerts:
            print(f"  🔴 {a}")
    else:
        print("  ✅ 无告警")

    print(f"\n{'=' * 60}")
    print(f"  巡检完成")
    print(f"{'=' * 60}")


if __name__ == '__main__':
    main()
