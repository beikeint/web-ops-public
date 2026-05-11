#!/usr/bin/env bash
# pre-deploy-quality-check.sh — 运营智能体在 deploy 前必跑的质量硬门禁
# v10.6+2 (2026-05-07 立) — 跨 4 客户质量审计驱动 + demo-a 反 AI 味 (反馈3)
# 参考：智能体/运营/网站运营-web-ops/案例库/通用教训/2026-05-07-质量审计教训-HCU-SpamBrain.md
# v10.6+2 加门禁 #7：产品页/Solution 页反 AI 味 (demo-a 反馈3 "AI 化检测深度检测去 AI 味")
#
# 用法: bash pre-deploy-quality-check.sh <客户站根目录>
# 例:   bash pre-deploy-quality-check.sh ${WORKSPACE_ROOT}/客户/Demo-D-client-A/website
#
# 自适应博客架构：
#   - 老 starter 架构: src/data/blog-posts.ts (TypeScript inline body)
#   - 新 starter 架构: src/content/blog/en/*.md (Astro content collections)
#
# 退出码: 0 = 全过 / 非 0 = 阻断 deploy

set -uo pipefail

SITE_ROOT="${1:-}"
if [ -z "$SITE_ROOT" ] || [ ! -d "$SITE_ROOT" ]; then
  echo "🔴 用法错误: bash $0 <客户站根目录>"
  exit 99
fi

cd "$SITE_ROOT" || exit 99

FAIL_COUNT=0
FAIL_GATES=""
WARN_COUNT=0

# 检测博客架构
USES_TS_BLOG=0
USES_MD_BLOG=0
[ -f "src/data/blog-posts.ts" ] && USES_TS_BLOG=1
[ -d "src/content/blog/en" ] && USES_MD_BLOG=1

echo "🛡️  Pre-Deploy Quality Check v10.6"
echo "站点: $SITE_ROOT"
echo "博客架构: $([ "$USES_TS_BLOG" = "1" ] && echo "TypeScript blog-posts.ts") $([ "$USES_MD_BLOG" = "1" ] && echo "+ Markdown content collections")"
echo "================================================================"

# ============================================================
# 门禁 #1：E-E-A-T 强制（v10.6 完整版需 starter interface 升级）
# ============================================================
echo ""
echo "[1/6] E-E-A-T 强制 — author 真名 + LinkedIn URL + Person Schema sameAs"

if [ "$USES_TS_BLOG" = "1" ]; then
  HAS_AUTHOR_FIELD=$(grep -cE "^\s*author:" src/data/blog-posts.ts 2>/dev/null)
  HAS_AUTHOR_URL=$(grep -cE "^\s*authorUrl:" src/data/blog-posts.ts 2>/dev/null)
  HAS_AUTHOR_INTERFACE=$(grep -cE "^\s*author\?:" src/data/blog-posts.ts 2>/dev/null)
  if [ "$HAS_AUTHOR_INTERFACE" -eq 0 ] && [ "$HAS_AUTHOR_FIELD" -eq 0 ]; then
    echo "  ⏭️  starter BlogPost interface 缺 author/authorUrl 字段（v10.6 P1 跨智能体待办）"
    echo "  ⚠️  当前 .ts 架构无法落地 #1 门禁，已标 P1 给建站智能体升级 interface"
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
fi
if [ "$USES_MD_BLOG" = "1" ]; then
  E1_FAIL=0
  for blog in $(find src/content/blog/en -name "*.md" 2>/dev/null); do
    AUTHOR=$(awk '/^---$/{f=!f} f && /^author:/{print; exit}' "$blog" | sed 's/^author: *//;s/^"//;s/"$//')
    AUTHOR_URL=$(awk '/^---$/{f=!f} f && /^authorUrl:/{print; exit}' "$blog" | sed 's/^authorUrl: *//;s/^"//;s/"$//')
    if [ -z "$AUTHOR" ] || echo "$AUTHOR" | grep -qiE "(organization|team|editorial|technical team|staff|marketing|admin)"; then
      echo "  🔴 $blog: author 缺失或为集体名 ($AUTHOR)"
      E1_FAIL=$((E1_FAIL + 1))
    fi
    if [ -z "$AUTHOR_URL" ] || ! echo "$AUTHOR_URL" | grep -qE "linkedin\.com/in/"; then
      echo "  🔴 $blog: authorUrl 缺失或不是 LinkedIn 个人页"
      E1_FAIL=$((E1_FAIL + 1))
    fi
  done
  if [ "$E1_FAIL" -gt 0 ]; then
    echo "  ❌ 门禁 #1 失败: $E1_FAIL 处违规"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_GATES="$FAIL_GATES #1"
  else
    echo "  ✅ 门禁 #1 通过"
  fi
fi

# ============================================================
# 门禁 #2：权威外链 ≥ 2（每篇博客正文必含 ≥ 2 真权威源超链接）
# ============================================================
echo ""
echo "[2/6] 权威外链 ≥ 2 — 真权威源 (osha/niosh/cdc/nih/epa/echa/fda/cen/eumeps/epro/astm/iso/hse/fao/iiar/sciencedirect/nature/doi)"

AUTHORITY_RE='https?://([a-z0-9.-]+\.)?(osha|niosh|cdc|nih|epa|echa|fda|cen|eumeps|epro|astm|iso|hse|fao|iiar|sciencedirect|nature|doi)\.'

if [ "$USES_TS_BLOG" = "1" ]; then
  # 在 .ts 中按博客 entry 块切分，每个 entry 内 grep 权威 URL
  E2_FAIL=0
  python3 - <<'PYEOF' 2>/dev/null
import re, os, sys
fp = "src/data/blog-posts.ts"
if not os.path.isfile(fp): sys.exit(0)
content = open(fp).read()
# 切分博客条目（按 slug:）
entries = re.split(r"^\s*\{\s*$", content, flags=re.MULTILINE)
authority_re = re.compile(r"https?://([a-z0-9.-]+\.)?(osha|niosh|cdc|nih|epa|echa|fda|cen|eumeps|epro|astm|iso|hse|fao|iiar|sciencedirect|nature|doi)\.", re.IGNORECASE)
fail = 0
for entry in entries:
    slug_match = re.search(r"slug:\s*['\"]([^'\"]+)['\"]", entry)
    if not slug_match: continue
    slug = slug_match.group(1)
    # 提取 body.en 内容（粗略：取 body: { en: `...` } 段）
    body_match = re.search(r"en:\s*`([^`]+)`", entry, re.DOTALL)
    if not body_match: continue
    body = body_match.group(1)
    links = authority_re.findall(body)
    if len(links) < 2:
        print(f"  🔴 博客 {slug}: 真权威外链 {len(links)} < 2")
        fail += 1
if fail > 0:
    print(f"  ❌ 门禁 #2 失败: {fail} 篇博客权威外链不足")
    sys.exit(2)
else:
    print("  ✅ 门禁 #2 通过")
PYEOF
  PY_EXIT=$?
  if [ "$PY_EXIT" -eq 2 ]; then
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_GATES="$FAIL_GATES #2"
  fi
fi

if [ "$USES_MD_BLOG" = "1" ]; then
  E2_FAIL=0
  for blog in $(find src/content/blog/en -name "*.md" 2>/dev/null); do
    LINKS=$(grep -cE "$AUTHORITY_RE" "$blog" 2>/dev/null)
    if [ "$LINKS" -lt 2 ]; then
      echo "  🔴 $blog: 真权威外链 $LINKS < 2"
      E2_FAIL=$((E2_FAIL + 1))
    fi
  done
  if [ "$E2_FAIL" -gt 0 ]; then
    echo "  ❌ 门禁 #2 失败: $E2_FAIL 篇 .md 博客权威外链不足"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_GATES="$FAIL_GATES #2"
  fi
fi

# ============================================================
# 门禁 #3：boilerplate Schema + fake review + 占位文字（全站扫）
# ============================================================
echo ""
echo "[3/6] boilerplate Schema / fake review / 占位文字反复用扫描"

E3_FAIL=0
# fake AggregateRating（精确匹配 Schema 真违规，排除注释/博客业务术语）
# v10.6+1 (2026-05-07) 修：原正则误把博客正文 "South American packaging" / 注释清扫记录都判违规
FAKE_RATING=$(grep -rEn '"@type":\s*"AggregateRating"|aggregateRating:\s*\{[^}]*ratingValue' src/ 2>/dev/null \
              | grep -vE '//.*删除|//.*已清|^\s*//' \
              | wc -l)
if [ "$FAKE_RATING" -gt 0 ]; then
  echo "  🔴 发现 $FAKE_RATING 处真 fake AggregateRating Schema"
  grep -rEn '"@type":\s*"AggregateRating"|aggregateRating:\s*\{[^}]*ratingValue' src/ 2>/dev/null \
    | grep -vE '//.*删除|//.*已清|^\s*//' | head -3 | sed 's/^/      /'
  E3_FAIL=$((E3_FAIL + 1))
fi
# 假 Review（精确匹配模板代码内出现，不扫博客正文里的合法地理/业务词）
FAKE_REVIEW=$(grep -rEn 'reviewBody:\s*[\x27"]A South American packaging manufacturer|reviewBody:\s*[\x27"]Sample testimonial|reviewBody:\s*[\x27"]Demo customer|Lorem ipsum.*reviewBody' src/ 2>/dev/null \
              | grep -vE '//.*删除|//.*已清|^\s*//' \
              | wc -l)
if [ "$FAKE_REVIEW" -gt 0 ]; then
  echo "  🔴 发现 $FAKE_REVIEW 处真假 Review 模板文案"
  E3_FAIL=$((E3_FAIL + 1))
fi
# testimonials 占位
TESTIMONIAL_PLACEHOLDER=$(grep -rE "testimonialsFooterNote|will appear here|Real testimonials.*will|Sample.*testimonial|placeholder.*testimonial" src/ 2>/dev/null | wc -l)
if [ "$TESTIMONIAL_PLACEHOLDER" -gt 0 ]; then
  echo "  🔴 发现 $TESTIMONIAL_PLACEHOLDER 处 testimonials 占位文字"
  E3_FAIL=$((E3_FAIL + 1))
fi
if [ "$E3_FAIL" -gt 0 ]; then
  echo "  ❌ 门禁 #3 失败: $E3_FAIL 类违规"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  FAIL_GATES="$FAIL_GATES #3"
else
  echo "  ✅ 门禁 #3 通过"
fi

# ============================================================
# 门禁 #4：build-time 资源完整性（博客图存在性 + 多语种 body 非空）
# ============================================================
echo ""
echo "[4/6] 资源完整性 — 博客封面图存在 + 6 语种 body ≥ 500 字符"

E4_FAIL=0
if [ "$USES_TS_BLOG" = "1" ]; then
  python3 - <<'PYEOF' 2>/dev/null
import re, os, sys
fp = "src/data/blog-posts.ts"
if not os.path.isfile(fp): sys.exit(0)
content = open(fp).read()
entries = re.split(r"^\s*\{\s*$", content, flags=re.MULTILINE)
fail = 0
for entry in entries:
    slug_match = re.search(r"slug:\s*['\"]([^'\"]+)['\"]", entry)
    if not slug_match: continue
    slug = slug_match.group(1)
    # 检查 image 字段（v11.1 修：必须非注释行 / 排除 // TODO 形式）
    # 行首只能是空白，不能是 // 注释
    image_match = re.search(r"^[ \t]*image:\s*['\"]([^'\"]+)['\"]", entry, re.MULTILINE)
    if image_match:
        img_path = image_match.group(1).lstrip("/")
        if not os.path.isfile(f"public/{img_path}"):
            print(f"  🔴 博客 {slug}: 封面图 broken → {image_match.group(1)}")
            fail += 1
    # 检查 6 语种 body 非空（≥ 500 字符）
    for lang in ["en", "es", "fr", "ar", "ru", "zh", "pt"]:
        body_match = re.search(rf"\b{lang}:\s*`([^`]*)`", entry, re.DOTALL)
        if body_match:
            body_text = body_match.group(1)
            if len(body_text) < 500:
                print(f"  🔴 博客 {slug}: body.{lang} {len(body_text)} 字符 < 500")
                fail += 1
if fail > 0:
    print(f"  ❌ 门禁 #4 失败: {fail} 处资源缺失")
    sys.exit(4)
else:
    print("  ✅ 门禁 #4 通过")
PYEOF
  PY_EXIT=$?
  if [ "$PY_EXIT" -eq 4 ]; then
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_GATES="$FAIL_GATES #4"
  fi
fi

if [ "$USES_MD_BLOG" = "1" ]; then
  E4_FAIL=0
  for blog in $(find src/content/blog/en -name "*.md" 2>/dev/null); do
    COVER=$(awk '/^---$/{f=!f} f && /^(cover|image|heroImage):/{print; exit}' "$blog" | sed 's/^[a-zA-Z]*: *//;s/^"//;s/"$//')
    if [ -n "$COVER" ] && [ ! -f "public${COVER}" ] && [ ! -f "public/${COVER#/}" ]; then
      echo "  🔴 $blog: 封面图 broken → $COVER"
      E4_FAIL=$((E4_FAIL + 1))
    fi
  done
  for lang in es fr ar ru zh pt; do
    if [ -d "src/content/blog/$lang" ]; then
      for blog in $(find "src/content/blog/$lang" -name "*.md" 2>/dev/null); do
        BODY_SIZE=$(awk '/^---$/{i++; next} i==2{print}' "$blog" 2>/dev/null | wc -c)
        if [ "$BODY_SIZE" -lt 500 ]; then
          echo "  🔴 $blog: body $BODY_SIZE 字符 < 500"
          E4_FAIL=$((E4_FAIL + 1))
        fi
      done
    fi
  done
  if [ "$E4_FAIL" -gt 0 ]; then
    echo "  ❌ 门禁 #4 失败"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_GATES="$FAIL_GATES #4"
  fi
fi

# ============================================================
# 门禁 #5：同结构博客 14 天冷却（templateType 反 burst）
# ============================================================
echo ""
echo "[5/6] 同结构博客 14 天冷却 — templateType 反 burst"

if [ "$USES_TS_BLOG" = "1" ]; then
  HAS_TEMPLATE_TYPE=$(grep -c "templateType" src/data/blog-posts.ts 2>/dev/null)
  if [ "$HAS_TEMPLATE_TYPE" -eq 0 ]; then
    echo "  ⏭️  starter BlogPost interface 缺 templateType 字段（v10.6 P1 跨智能体待办）"
    echo "  ⚠️  当前 .ts 架构无法落地 #5 门禁，已标 P1 给建站智能体"
    WARN_COUNT=$((WARN_COUNT + 1))
  fi
fi

# ============================================================
# 门禁 #6：B2B 节奏阈值（git log 算最近 7/30 天博客 commit 数）
# ============================================================
echo ""
echo "[6/7] B2B 节奏阈值 — 单站 ≤ 3 篇/周 / ≤ 8 篇/月"

E6_FAIL=0
# 用 git log 算 feat(blog) 数量（自适应所有架构）
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  WEEK_COUNT=$(git log --since="7 days ago" --pretty=format:"%s" 2>/dev/null \
               | grep -cE "^feat\(blog\)|^content:.*发布博客|^feat\(content\)" 2>/dev/null)
  MONTH_COUNT=$(git log --since="30 days ago" --pretty=format:"%s" 2>/dev/null \
                | grep -cE "^feat\(blog\)|^content:.*发布博客|^feat\(content\)" 2>/dev/null)
  echo "  📊 本周博客 commit $WEEK_COUNT 篇 / 本月 $MONTH_COUNT 篇"
  if [ "$WEEK_COUNT" -gt 3 ]; then
    echo "  🔴 本周 $WEEK_COUNT 篇 > 3 阈值（B2B 制造商不可信节奏 → SpamBrain 信号）"
    E6_FAIL=$((E6_FAIL + 1))
  fi
  if [ "$MONTH_COUNT" -gt 8 ]; then
    echo "  🔴 本月 $MONTH_COUNT 篇 > 8 阈值"
    E6_FAIL=$((E6_FAIL + 1))
  fi
  if [ "$E6_FAIL" -gt 0 ]; then
    echo "  ❌ 门禁 #6 失败"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_GATES="$FAIL_GATES #6"
  else
    echo "  ✅ 门禁 #6 通过"
  fi
else
  echo "  ⏭️  跳过（非 git 仓库）"
fi

# ============================================================
# 门禁 #7：产品页 / Solution 页反 AI 味 (v10.6+2, 2026-05-07 立)
#  起源：demo-a 反馈3 "AI 化检测深度检测去 AI 味"
#  扫描：products-deep-dive.ts / solutions-deep-dive.ts / 产品页 .astro 模板
# ============================================================
echo ""
echo "[7/7] 产品页 / Solution 页反 AI 味 — hyped phrase 密度 + 模板句 + 占位词"

E7_FAIL=0
E7_WARN=0

PRODUCT_FILES=""
[ -f "src/data/products-deep-dive.ts" ] && PRODUCT_FILES="$PRODUCT_FILES src/data/products-deep-dive.ts"
[ -f "src/data/solutions-deep-dive.ts" ] && PRODUCT_FILES="$PRODUCT_FILES src/data/solutions-deep-dive.ts"
[ -f "src/data/products.ts" ] && PRODUCT_FILES="$PRODUCT_FILES src/data/products.ts"

if [ -n "$PRODUCT_FILES" ]; then
  # ① hyped phrase 密度（per-file 阈值 ≥ 25 = fail / 15-24 = warn）
  HYPED_RE='industry-leading|world-class|cutting-edge|state-of-the-art|best-in-class|next-generation|revolutionary|pioneering|unmatched|unparalleled|game-changing|groundbreaking|seamless integration|second to none|one-stop'
  for f in $PRODUCT_FILES; do
    HYPE_COUNT=$(grep -ciE "$HYPED_RE" "$f" 2>/dev/null)
    LINES=$(wc -l < "$f")
    # 每千行允许 8 个，超出标记
    THRESHOLD=$((LINES / 1000 * 8 + 8))
    if [ "$HYPE_COUNT" -gt "$THRESHOLD" ]; then
      DENSITY=$((HYPE_COUNT * 1000 / LINES))
      if [ "$DENSITY" -gt 8 ]; then
        echo "  🔴 $f: hyped phrase $HYPE_COUNT / 千行密度 $DENSITY (> 8 阈值)"
        E7_FAIL=$((E7_FAIL + 1))
      else
        echo "  🟡 $f: hyped phrase $HYPE_COUNT (warn)"
        E7_WARN=$((E7_WARN + 1))
      fi
    fi
  done

  # ② 模板感套话句（强信号，命中 1 次即标）
  TEMPLATE_PHRASES='Comprehensive solutions for all your needs|When it comes to|We pride ourselves on|At the end of the day|In today.{0,3}s.{0,30}(world|market|industry)|With years of experience in the industry|Our team of (experts|professionals)|Whether you.{0,3}re|Look no further|Trust us to deliver'
  for f in $PRODUCT_FILES; do
    TPL_HITS=$(grep -ciE "$TEMPLATE_PHRASES" "$f" 2>/dev/null)
    if [ "$TPL_HITS" -gt 0 ]; then
      echo "  🔴 $f: 模板感套话句 $TPL_HITS 处"
      grep -nEi "$TEMPLATE_PHRASES" "$f" | head -3 | sed 's/^/      /'
      E7_FAIL=$((E7_FAIL + 1))
    fi
  done

  # ③ 占位词（Lorem / TBD / TODO / Coming soon 在 active 内容里）
  PLACEHOLDER_RE='Lorem ipsum|>TBD<|>TODO<|<!--\s*TODO|placeholder content|sample text content|content will be filled|filled during build|coming soon\.\s*$'
  for f in $PRODUCT_FILES; do
    PLACE_HITS=$(grep -cE "$PLACEHOLDER_RE" "$f" 2>/dev/null)
    if [ "$PLACE_HITS" -gt 0 ]; then
      # solutionsComingSoon 数组里的 "Coming soon" 是合法占位（hub 显示，detail 未生成）
      LEGIT=$(grep -B 2 -E "Coming soon" "$f" 2>/dev/null | grep -c "solutionsComingSoon\|status:.*coming-soon")
      NET=$((PLACE_HITS - LEGIT))
      if [ "$NET" -gt 0 ]; then
        echo "  🔴 $f: 占位词 $NET 处（已扣除 coming-soon hub 合法占位 $LEGIT）"
        E7_FAIL=$((E7_FAIL + 1))
      fi
    fi
  done

  # ④ 产品页 .astro 模板里的硬编码 hyped phrase（高严重，因为影响所有产品页）
  if [ -d "src/pages" ]; then
    ASTRO_HITS=$(grep -rciE "$HYPED_RE" src/pages/**/products/*.astro src/pages/**/solutions/*.astro 2>/dev/null | awk -F: '$2>3 {print}' | wc -l)
    if [ "$ASTRO_HITS" -gt 0 ]; then
      echo "  🟡 .astro 模板硬编码 hyped phrase $ASTRO_HITS 处（warn — 部分行业用语 OK，>3/页 需复盘）"
      E7_WARN=$((E7_WARN + 1))
    fi
  fi

  if [ "$E7_FAIL" -gt 0 ]; then
    echo "  ❌ 门禁 #7 失败: $E7_FAIL 处反 AI 味违规"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    FAIL_GATES="$FAIL_GATES #7"
  elif [ "$E7_WARN" -gt 0 ]; then
    echo "  🟡 门禁 #7 通过 (含 $E7_WARN 处 warn)"
    WARN_COUNT=$((WARN_COUNT + E7_WARN))
  else
    echo "  ✅ 门禁 #7 通过"
  fi
else
  echo "  ⏭️  跳过（站点无 products-deep-dive / solutions-deep-dive 文件）"
fi

# ============================================================
# 总结
# ============================================================
echo ""
echo "================================================================"
if [ "$FAIL_COUNT" -eq 0 ]; then
  if [ "$WARN_COUNT" -gt 0 ]; then
    echo "🟡 $WARN_COUNT 项需 starter interface 升级（P1 给建站智能体），其他门禁通过"
  fi
  echo "✅ 可以 deploy"
  exit 0
else
  echo "❌ 失败 $FAIL_COUNT 个门禁:$FAIL_GATES"
  echo "   ⚠️  另 $WARN_COUNT 项待 starter 升级激活"
  echo ""
  echo "修复指南: 智能体/运营/网站运营-web-ops/.claude/skills/content-production.md v10.6 章节"
  echo "教训档案: 智能体/运营/网站运营-web-ops/案例库/通用教训/2026-05-07-质量审计教训-HCU-SpamBrain.md"
  exit "$FAIL_COUNT"
fi
