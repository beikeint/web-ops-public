#!/usr/bin/env python3
"""
demo-b.com v2.5/v2.6/v2.7 视觉升级 7 天后 GSC 复盘
基线 (升级前 GSC 28 天): /en/blog/pva-glue-vs-epoxy-resin/ 177 imp pos 5.9 / 总 339 imp
退步阈值: 主关键页 imp 跌 >30% 或 pos 跌 >3 位 → FAIL
触发: verification-runner 自动跑, 5-10 后到期
来源: 客户/Demo-B-client-D/docs/v2.7-升级交接给-web-ops.md 第三节
"""
import sys, json
from datetime import datetime, timedelta
from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY_FILE = '${GSC_CONFIG_PATH}/example-seo.json'
SCOPES = ['https://www.googleapis.com/auth/webmasters.readonly']
SITE_URL = 'https://demo-b.com/'  # URL-prefix 属性 (sc-domain 当前 Unverified User 无权限, 走 URL-prefix Full User)

# 升级前 baseline (2026-05-02 site-builder 交接文档记录)
BASELINE = {
    'total_imp_28d': 339,
    'key_pages': {
        '/en/blog/pva-glue-vs-epoxy-resin/': {'imp': 177, 'pos': 5.9, 'tag': '⭐⭐⭐ 流量支柱'},
        '/ru/products/film-covering-adhesive/': {'imp': None, 'pos': 1.0, 'tag': '⭐ 排名 #1'},
    },
}
IMP_DROP_THRESHOLD = 0.30   # imp 跌 30% 触警
POS_DROP_THRESHOLD = 3.0    # pos 跌 3 位触警


def query_gsc_28d():
    creds = service_account.Credentials.from_service_account_file(KEY_FILE, scopes=SCOPES)
    svc = build('searchconsole', 'v1', credentials=creds)
    end = datetime.now().strftime('%Y-%m-%d')
    start = (datetime.now() - timedelta(days=28)).strftime('%Y-%m-%d')
    body = {
        'startDate': start, 'endDate': end,
        'dimensions': ['page'],
        'rowLimit': 200,
    }
    return svc.searchanalytics().query(siteUrl=SITE_URL, body=body).execute().get('rows', [])


def main():
    rows = query_gsc_28d()
    total_imp = sum(int(r['impressions']) for r in rows)
    by_page = {}
    for r in rows:
        page = r['keys'][0]
        suffix = page.split('demo-b.com', 1)[1] if 'demo-b.com' in page else page
        by_page[suffix] = {'imp': int(r['impressions']), 'pos': r['position']}

    alerts = []
    info = []

    # 总展示对比
    base_total = BASELINE['total_imp_28d']
    delta_pct = (total_imp - base_total) / base_total * 100
    info.append(f"总展示 28d: {total_imp} (升级前 {base_total}, Δ {delta_pct:+.1f}%)")
    if total_imp < base_total * (1 - IMP_DROP_THRESHOLD):
        alerts.append(f"🔴 总展示退步 {abs(delta_pct):.1f}% 超阈值 30%")

    # 关键页对比
    for path, base in BASELINE['key_pages'].items():
        cur = by_page.get(path)
        if not cur:
            alerts.append(f"🔴 关键页 {path} 28 天 0 展示 (升级前 {base.get('imp')} imp pos {base['pos']})")
            continue
        pos_delta = cur['pos'] - base['pos']
        imp_delta_pct = ((cur['imp'] - base['imp']) / base['imp'] * 100) if base.get('imp') else None
        line = f"  {path} {base['tag']}: imp {cur['imp']} (前 {base.get('imp')}), pos {cur['pos']:.1f} (前 {base['pos']}, Δ {pos_delta:+.1f})"
        info.append(line)
        if base.get('imp') and imp_delta_pct is not None and imp_delta_pct < -IMP_DROP_THRESHOLD * 100:
            alerts.append(f"🔴 {path} imp 跌 {abs(imp_delta_pct):.1f}% > 30%")
        if pos_delta > POS_DROP_THRESHOLD:
            alerts.append(f"🔴 {path} pos 退 {pos_delta:.1f} 位 > 3 位")

    print('\n'.join(info))
    if alerts:
        print('\n'.join(alerts))
        # 写一份对比报告便于人看
        out = '${WORKSPACE_ROOT}/客户/Demo-B-client-D/docs/v2.7-GSC-7天复盘.md'
        with open(out, 'w', encoding='utf-8') as f:
            f.write(f"# demo-b.com v2.7 升级 7 天 GSC 复盘\n\n")
            f.write(f"复盘时间: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n")
            f.write("## 基线对比\n\n" + '\n'.join(info) + "\n\n")
            f.write("## 告警\n\n" + '\n'.join(alerts) + "\n\n")
            f.write("## 处置建议\n\n如确认是 v2.7 升级导致的退步, 立刻 git revert 6 commit 并重新部署上版本备份.\n")
        sys.exit(1)
    print("✅ 无明显退步, v2.7 升级 7 天 GSC 健康")
    sys.exit(0)


if __name__ == '__main__':
    main()
