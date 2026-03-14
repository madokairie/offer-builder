'use client';

import { useState, useEffect, useMemo } from 'react';

// ─── 型定義 ─────────────────────────────────────

interface Bonus {
  id: string;
  name: string;
  description: string;
  value: string;
}

interface PriceTier {
  id: string;
  name: string;
  price: string;
  description: string;
  includes: string[];
  isRecommended: boolean;
}

interface Urgency {
  type: 'deadline' | 'limited-spots' | 'early-bird' | 'price-increase' | 'custom';
  description: string;
}

// 価値方程式の4要素（各1-5で評価）
interface ValueEquation {
  dreamOutcome: number;    // 理想の結果の大きさ
  likelihood: number;      // 達成できる可能性
  timeToResult: number;    // 結果が出るまでの速さ（高い=早い）
  effortRequired: number;  // 労力の少なさ（高い=楽）
}

interface OfferData {
  productName: string;
  tagline: string;
  targetPain: string;
  desiredOutcome: string;
  priceTiers: PriceTier[];
  paymentPlans: string[];
  anchorPrice: string;
  bonuses: Bonus[];
  urgencyElements: Urgency[];
  ctaText: string;
  notes: string;
  valueEquation: ValueEquation;
}

// ─── 初期値 ─────────────────────────────────────

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

const EMPTY_OFFER: OfferData = {
  productName: '',
  tagline: '',
  targetPain: '',
  desiredOutcome: '',
  priceTiers: [{ id: genId(), name: 'スタンダード', price: '', description: '', includes: [''], isRecommended: true }],
  paymentPlans: [''],
  anchorPrice: '',
  bonuses: [],
  urgencyElements: [],
  ctaText: '今すぐ申し込む',
  notes: '',
  valueEquation: { dreamOutcome: 3, likelihood: 3, timeToResult: 3, effortRequired: 3 },
};

// ─── ストレージ ─────────────────────────────────

const OFFERS_KEY = 'offer-builder-offers';
const ACTIVE_KEY = 'offer-builder-active';

interface SavedOffer {
  id: string;
  name: string;
  data: OfferData;
  createdAt: string;
  updatedAt: string;
}

function loadOffers(): SavedOffer[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(OFFERS_KEY) || '[]'); } catch { return []; }
}
function saveOffers(offers: SavedOffer[]) { localStorage.setItem(OFFERS_KEY, JSON.stringify(offers)); }

// ─── テンプレート ────────────────────────────────

const TEMPLATES = [
  {
    name: 'チャレンジ型',
    desc: '低価格のチャレンジで体験させてからバックエンドへ誘導',
    icon: '🏃',
    data: {
      ...EMPTY_OFFER,
      tagline: '○日間で△△を実現するチャレンジプログラム',
      priceTiers: [
        { id: genId(), name: 'チャレンジ参加', price: '3,000', description: 'チャレンジ期間中の全コンテンツにアクセス', includes: ['動画コンテンツ全編', 'ワークシート', 'コミュニティアクセス', 'Live Q&A参加権'], isRecommended: true },
      ],
      bonuses: [
        { id: genId(), name: 'クイックスタートガイド', description: '参加初日から成果を出すためのステップバイステップガイド', value: '9,800円相当' },
        { id: genId(), name: 'テンプレート集', description: 'そのまま使える実践テンプレート', value: '19,800円相当' },
      ],
      urgencyElements: [
        { type: 'deadline' as const, description: '○月○日 23:59まで' },
        { type: 'limited-spots' as const, description: '先着100名限定' },
      ],
      valueEquation: { dreamOutcome: 4, likelihood: 4, timeToResult: 5, effortRequired: 4 },
    },
  },
  {
    name: 'セミナー型',
    desc: 'セミナーで教育・信頼構築してからバックエンド販売',
    icon: '🎤',
    data: {
      ...EMPTY_OFFER,
      tagline: '△△を実現する完全マスタープログラム',
      priceTiers: [
        { id: genId(), name: 'ベーシック', price: '', description: '動画教材＋基本サポート', includes: ['全モジュール動画', 'ワークブック', 'メールサポート3ヶ月'], isRecommended: false },
        { id: genId(), name: 'プレミアム', price: '', description: '個別コンサル＋グループコーチング付き', includes: ['ベーシック全内容', '個別コンサル月1回', 'グループコーチング週1回', 'チャットサポート無制限'], isRecommended: true },
        { id: genId(), name: 'VIP', price: '', description: '完全マンツーマン＋代行サポート', includes: ['プレミアム全内容', '個別コンサル月2回', '一部作業代行', '優先サポート'], isRecommended: false },
      ],
      paymentPlans: ['一括払い', '3回分割', '6回分割'],
      bonuses: [
        { id: genId(), name: '個別戦略セッション', description: '申込後30日以内に1on1で戦略を策定', value: '50,000円相当' },
        { id: genId(), name: '成功事例テンプレート集', description: '実際に成果を出した受講生のテンプレートを完全公開', value: '29,800円相当' },
      ],
      urgencyElements: [
        { type: 'deadline' as const, description: 'セミナー後72時間以内の申込限定' },
        { type: 'limited-spots' as const, description: '個別対応のため月5名限定' },
      ],
      valueEquation: { dreamOutcome: 5, likelihood: 4, timeToResult: 3, effortRequired: 3 },
    },
  },
  {
    name: '単発商品型',
    desc: '単発の講座・教材・サービスをシンプルに販売',
    icon: '📦',
    data: {
      ...EMPTY_OFFER,
      tagline: '△△が手に入る○○講座',
      priceTiers: [
        { id: genId(), name: '通常プラン', price: '', description: '講座コンテンツ一式', includes: ['動画コンテンツ', 'テキスト教材', 'ワークシート'], isRecommended: true },
      ],
      bonuses: [
        { id: genId(), name: '限定特典', description: '購入者だけがもらえるボーナスコンテンツ', value: '' },
      ],
      urgencyElements: [
        { type: 'deadline' as const, description: '○月○日まで特別価格' },
      ],
      valueEquation: { dreamOutcome: 3, likelihood: 3, timeToResult: 4, effortRequired: 4 },
    },
  },
];

// ─── ラベル定義 ─────────────────────────────────

const URGENCY_LABELS: Record<string, string> = {
  'deadline': '期間限定',
  'limited-spots': '人数限定',
  'early-bird': '早期割引',
  'price-increase': '値上げ予告',
  'custom': 'その他',
};

const URGENCY_ICONS: Record<string, string> = {
  'deadline': '⏰',
  'limited-spots': '🔥',
  'early-bird': '🎯',
  'price-increase': '📈',
  'custom': '⚡',
};

// ─── オファー診断エンジン ────────────────────────

interface DiagnosticItem {
  category: string;
  label: string;
  status: 'good' | 'warning' | 'missing';
  score: number;      // 0-10
  maxScore: number;
  advice: string;
}

function parseNum(s: string): number {
  return parseInt(s.replace(/,/g, '').replace(/[^0-9]/g, '')) || 0;
}

function diagnoseOffer(d: OfferData): DiagnosticItem[] {
  const items: DiagnosticItem[] = [];
  const mainPrice = d.priceTiers.find(t => t.isRecommended)?.price || d.priceTiers[0]?.price || '';
  const mainPriceNum = parseNum(mainPrice);
  const anchorNum = parseNum(d.anchorPrice);
  const totalBonus = d.bonuses.reduce((s, b) => s + parseNum(b.value), 0);
  const filledIncludes = d.priceTiers.flatMap(t => t.includes.filter(Boolean));

  // ── メッセージの明確さ ──
  items.push({
    category: 'メッセージ', label: 'ターゲットの悩みが明確',
    status: d.targetPain.length >= 10 ? 'good' : d.targetPain.length > 0 ? 'warning' : 'missing',
    score: d.targetPain.length >= 10 ? 10 : d.targetPain.length > 0 ? 5 : 0, maxScore: 10,
    advice: d.targetPain.length >= 10
      ? '悩みが具体的に書かれています'
      : d.targetPain.length > 0
        ? '悩みをもっと具体的に。「誰が」「どんな状況で」「何に困っている」を入れると刺さりやすくなります'
        : 'ターゲットの悩みが未入力。「○○な人が△△できない」のように書くと、見込み客が「自分のことだ」と感じます',
  });

  items.push({
    category: 'メッセージ', label: 'ベネフィットが具体的',
    status: d.desiredOutcome.length >= 10 ? 'good' : d.desiredOutcome.length > 0 ? 'warning' : 'missing',
    score: d.desiredOutcome.length >= 10 ? 10 : d.desiredOutcome.length > 0 ? 5 : 0, maxScore: 10,
    advice: d.desiredOutcome.length >= 10
      ? 'ベネフィットが具体的です'
      : d.desiredOutcome.length > 0
        ? '「○ヶ月で△△が手に入る」のように、期間・数値・具体的な成果を入れるとイメージしやすくなります'
        : '得られる結果が未入力。「何がどう変わるか」を具体的に書くと購入意欲が上がります',
  });

  // ── 価格設計 ──
  const hasTiers = d.priceTiers.length >= 2;
  items.push({
    category: '価格設計', label: '松竹梅（複数プラン）',
    status: d.priceTiers.length >= 3 ? 'good' : hasTiers ? 'warning' : 'missing',
    score: d.priceTiers.length >= 3 ? 10 : hasTiers ? 6 : 2, maxScore: 10,
    advice: d.priceTiers.length >= 3
      ? '3プラン構成で、中間プランへの誘導がしやすい状態です'
      : hasTiers
        ? '2プランでもOKですが、3プラン（松竹梅）にすると真ん中のプランが選ばれやすくなります（おとり効果）'
        : '1プランのみ。比較対象がないと「高い/安い」の判断がしにくくなります。最低2プラン用意するのがおすすめ',
  });

  items.push({
    category: '価格設計', label: 'アンカー価格の設定',
    status: anchorNum > 0 && mainPriceNum > 0 ? 'good' : anchorNum > 0 ? 'warning' : 'missing',
    score: anchorNum > 0 && mainPriceNum > 0 && anchorNum > mainPriceNum ? 10 : anchorNum > 0 ? 5 : 0, maxScore: 10,
    advice: anchorNum > 0 && mainPriceNum > 0
      ? anchorNum > mainPriceNum
        ? `通常${d.anchorPrice}円 → 実売${mainPrice}円で${Math.round((1 - mainPriceNum / anchorNum) * 100)}%OFFの見え方になっています`
        : 'アンカー価格が実売価格以下だと逆効果です。「この内容なら本来○○円の価値」を正直に設定してください'
      : anchorNum > 0
        ? '実売価格を入力すると、割引率が自動計算されます'
        : 'アンカー価格がありません。「この内容なら通常○○万円」と提示するだけで、実売価格の「お得感」が大幅にアップします',
  });

  const hasPayment = d.paymentPlans.filter(Boolean).length >= 2;
  items.push({
    category: '価格設計', label: '分割払いオプション',
    status: hasPayment ? 'good' : d.paymentPlans.filter(Boolean).length === 1 ? 'warning' : 'missing',
    score: hasPayment ? 8 : d.paymentPlans.filter(Boolean).length === 1 ? 4 : 0, maxScore: 8,
    advice: hasPayment
      ? '分割オプションがあることで、一括が厳しい層も申込可能になります'
      : mainPriceNum >= 50000
        ? `${mainPrice}円は分割なしだとハードルが高め。3回・6回の分割を用意すると月額${Math.round(mainPriceNum / 3).toLocaleString()}円〜で訴求できます`
        : '分割払いオプションは価格のハードルを下げる効果があります',
  });

  // ── 含まれるもの ──
  items.push({
    category: '価格設計', label: '含まれるものの明確さ',
    status: filledIncludes.length >= 4 ? 'good' : filledIncludes.length >= 2 ? 'warning' : 'missing',
    score: Math.min(filledIncludes.length * 2, 8), maxScore: 8,
    advice: filledIncludes.length >= 4
      ? '含まれるものが十分にリストアップされています'
      : filledIncludes.length >= 2
        ? '含まれるものをもっと細分化して。「動画教材」→「全12回の動画教材（各30分）」のように具体的にするとボリューム感が出ます'
        : '含まれるものが少なすぎます。提供するものをすべて書き出してください。細かく書くほど「こんなにもらえるの？」感が出ます',
  });

  // ── 特典 ──
  items.push({
    category: '特典', label: '特典の数',
    status: d.bonuses.length >= 3 ? 'good' : d.bonuses.length >= 1 ? 'warning' : 'missing',
    score: Math.min(d.bonuses.length * 3, 10), maxScore: 10,
    advice: d.bonuses.length >= 3
      ? `${d.bonuses.length}個の特典で特典スタッキングができています`
      : d.bonuses.length >= 1
        ? '特典が少なめ。「今申し込むとこれも、これも、これもつく」のスタック感が購入の後押しになります。3〜5個が理想'
        : '特典がありません。本体と関連するが別売りでも成立するものを特典にすると「お得感」が一気に上がります',
  });

  if (d.bonuses.length > 0) {
    const bonusWithValue = d.bonuses.filter(b => parseNum(b.value) > 0).length;
    items.push({
      category: '特典', label: '特典の金額表記',
      status: bonusWithValue === d.bonuses.length ? 'good' : bonusWithValue > 0 ? 'warning' : 'missing',
      score: bonusWithValue === d.bonuses.length ? 8 : bonusWithValue > 0 ? 4 : 0, maxScore: 8,
      advice: bonusWithValue === d.bonuses.length
        ? `全特典に金額が入っています。特典総額${totalBonus.toLocaleString()}円相当`
        : '特典には「○○円相当」と金額を入れてください。数字があると価値が伝わりやすくなります',
    });
  }

  if (totalBonus > 0 && mainPriceNum > 0) {
    const ratio = totalBonus / mainPriceNum;
    items.push({
      category: '特典', label: '特典と価格のバランス',
      status: ratio >= 0.5 ? 'good' : ratio >= 0.2 ? 'warning' : 'missing',
      score: ratio >= 0.5 ? 8 : ratio >= 0.2 ? 4 : 2, maxScore: 8,
      advice: ratio >= 0.5
        ? `特典総額が本体価格の${Math.round(ratio * 100)}%分。「本体+特典で実質○○円相当が${mainPrice}円」と訴求できます`
        : `特典総額が本体価格の${Math.round(ratio * 100)}%しかありません。特典を追加するか、各特典の価値をもっと高く見積もりましょう`,
    });
  }

  // ── 緊急性 ──
  items.push({
    category: '緊急性', label: '緊急性の要素',
    status: d.urgencyElements.length >= 2 ? 'good' : d.urgencyElements.length === 1 ? 'warning' : 'missing',
    score: Math.min(d.urgencyElements.length * 4, 10), maxScore: 10,
    advice: d.urgencyElements.length >= 2
      ? '複数の緊急性要素があります。期限×人数など組み合わせるとより効果的'
      : d.urgencyElements.length === 1
        ? '緊急性が1つだけ。「期限」+「人数」など2つ以上組み合わせると「今すぐ申し込む理由」が強くなります'
        : '緊急性がありません。「いつでも買える」と思われると後回しにされます。期限・人数制限・早期割引のいずれかは必須',
  });

  // ── 価値方程式 ──
  const ve = d.valueEquation;
  const veScore = (ve.dreamOutcome * ve.likelihood) / (Math.max(6 - ve.timeToResult, 1) * Math.max(6 - ve.effortRequired, 1));
  items.push({
    category: '価値方程式', label: '価値スコア',
    status: veScore >= 4 ? 'good' : veScore >= 2 ? 'warning' : 'missing',
    score: Math.min(Math.round(veScore * 2.5), 10), maxScore: 10,
    advice: veScore >= 4
      ? '理想の結果が大きく、実現しやすく、早く、楽に達成できるオファーです'
      : veScore >= 2
        ? '価値方程式のバランスを見直してください。「結果の大きさ」「実現可能性」を上げるか、「かかる時間」「必要な労力」を下げる工夫が必要'
        : '価値が伝わりにくいオファーです。「もっと早く結果が出る仕組み」や「労力を減らすサポート」を追加検討してください',
  });

  return items;
}

// ─── オファー診断パネル ─────────────────────────

function DiagnosticPanel({ data }: { data: OfferData }) {
  const items = useMemo(() => diagnoseOffer(data), [data]);
  const totalScore = items.reduce((s, i) => s + i.score, 0);
  const maxScore = items.reduce((s, i) => s + i.maxScore, 0);
  const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

  const categories = [...new Set(items.map(i => i.category))];

  const grade = pct >= 85 ? 'S' : pct >= 70 ? 'A' : pct >= 55 ? 'B' : pct >= 40 ? 'C' : 'D';
  const gradeColor = pct >= 85 ? '#059669' : pct >= 70 ? '#2563EB' : pct >= 55 ? '#D97706' : pct >= 40 ? '#EA580C' : '#DC2626';
  const gradeLabel = pct >= 85 ? '売れるオファー' : pct >= 70 ? 'あと少しで完成' : pct >= 55 ? '改善の余地あり' : pct >= 40 ? '要改善' : '設計不足';

  // 最も改善効果が高いものを抽出
  const topAdvice = items
    .filter(i => i.status !== 'good')
    .sort((a, b) => (b.maxScore - b.score) - (a.maxScore - a.score))
    .slice(0, 3);

  const ve = data.valueEquation;
  const veScore = (ve.dreamOutcome * ve.likelihood) / (Math.max(6 - ve.timeToResult, 1) * Math.max(6 - ve.effortRequired, 1));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* スコアカード */}
      <div style={{
        background: '#FFF', borderRadius: 16, overflow: 'hidden',
        border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '28px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 14, color: '#64748B', marginBottom: 8, fontWeight: 500 }}>オファー診断スコア</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
            <div style={{
              width: 90, height: 90, borderRadius: '50%',
              border: `4px solid ${gradeColor}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
            }}>
              <div style={{ fontSize: 32, fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{grade}</div>
              <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>{pct}点</div>
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#0F172A' }}>{gradeLabel}</div>
              <div style={{ fontSize: 14, color: '#64748B', marginTop: 4 }}>
                {items.filter(i => i.status === 'good').length}/{items.length}項目クリア
              </div>
            </div>
          </div>
        </div>

        {/* プログレスバー */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ height: 8, background: '#F1F5F9', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${pct}%`, borderRadius: 4,
              background: `linear-gradient(90deg, ${gradeColor}, ${gradeColor}dd)`,
              transition: 'width 0.5s ease',
            }} />
          </div>
        </div>
      </div>

      {/* 最優先の改善提案 */}
      {topAdvice.length > 0 && (
        <div style={{
          background: '#FFF', borderRadius: 16, overflow: 'hidden',
          border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        }}>
          <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>
              今すぐやるべきこと
            </h3>
          </div>
          <div style={{ padding: '16px 24px' }}>
            {topAdvice.map((item, i) => (
              <div key={i} style={{
                padding: '16px 0',
                borderBottom: i < topAdvice.length - 1 ? '1px solid #F1F5F9' : 'none',
                display: 'flex', gap: 14, alignItems: 'flex-start',
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                  background: item.status === 'missing' ? '#FEF2F2' : '#FEF9C3',
                  color: item.status === 'missing' ? '#DC2626' : '#CA8A04',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700,
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#0F172A', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>{item.advice}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 価値方程式 */}
      <div style={{
        background: '#FFF', borderRadius: 16, overflow: 'hidden',
        border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>価値方程式</h3>
          <div style={{ fontSize: 14, color: '#94A3B8', marginTop: 4 }}>
            価値 = (理想の結果 × 実現可能性) ÷ (かかる時間 × 必要な労力)
          </div>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{
            textAlign: 'center', marginBottom: 20, padding: '16px', borderRadius: 12,
            background: veScore >= 4 ? '#F0FDF4' : veScore >= 2 ? '#FFFBEB' : '#FEF2F2',
          }}>
            <div style={{ fontSize: 13, color: '#64748B', marginBottom: 4 }}>現在の価値スコア</div>
            <div style={{
              fontSize: 36, fontWeight: 800, lineHeight: 1,
              color: veScore >= 4 ? '#059669' : veScore >= 2 ? '#D97706' : '#DC2626',
            }}>{veScore.toFixed(1)}</div>
            <div style={{
              fontSize: 14, marginTop: 6,
              color: veScore >= 4 ? '#059669' : veScore >= 2 ? '#D97706' : '#DC2626',
            }}>
              {veScore >= 4 ? '高い価値を提供できている' : veScore >= 2 ? '改善すると成約率が上がる' : '価値の伝え方を再設計すべき'}
            </div>
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px',
            padding: '16px 0', borderTop: '1px solid #F1F5F9',
          }}>
            <VESlider label="理想の結果の大きさ" desc="人生が変わるレベルか" value={ve.dreamOutcome} color="#6366F1" isPositive
              tips={['ニッチすぎる', '小さい改善', '実用的な成果', '大きな変化', '人生が変わる']}
              onChange={v => {}} />
            <VESlider label="達成できる可能性" desc="本当に実現できそうか" value={ve.likelihood} color="#059669" isPositive
              tips={['証拠なし', '理論のみ', '一部成功例', '多数の実績', '再現性が高い']}
              onChange={v => {}} />
            <VESlider label="結果が出る速さ" desc="どのくらい早く結果が出るか" value={ve.timeToResult} color="#D97706" isPositive
              tips={['1年以上', '半年', '3ヶ月', '1ヶ月', '即日〜1週間']}
              onChange={v => {}} />
            <VESlider label="労力の少なさ" desc="どのくらい楽にできるか" value={ve.effortRequired} color="#DC2626" isPositive
              tips={['フルコミット', 'かなり大変', 'それなりに', '手軽', 'ほぼ不要']}
              onChange={v => {}} />
          </div>
        </div>
      </div>

      {/* カテゴリ別チェックリスト */}
      <div style={{
        background: '#FFF', borderRadius: 16, overflow: 'hidden',
        border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>チェックリスト</h3>
        </div>
        <div style={{ padding: '8px 24px 20px' }}>
          {categories.map(cat => (
            <div key={cat} style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 8, letterSpacing: '0.05em' }}>{cat}</div>
              {items.filter(i => i.category === cat).map((item, i) => (
                <div key={i} style={{
                  display: 'flex', gap: 12, alignItems: 'flex-start', padding: '10px 0',
                  borderBottom: '1px solid #F8FAFC',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: 6, flexShrink: 0, marginTop: 1,
                    background: item.status === 'good' ? '#D1FAE5' : item.status === 'warning' ? '#FEF9C3' : '#FEE2E2',
                    color: item.status === 'good' ? '#059669' : item.status === 'warning' ? '#CA8A04' : '#DC2626',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700,
                  }}>
                    {item.status === 'good' ? '✓' : item.status === 'warning' ? '!' : '✕'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: '#0F172A' }}>{item.label}</div>
                    <div style={{ fontSize: 13, color: '#94A3B8', marginTop: 2, lineHeight: 1.5 }}>{item.advice}</div>
                  </div>
                  <div style={{ fontSize: 13, color: '#94A3B8', flexShrink: 0, fontWeight: 500 }}>
                    {item.score}/{item.maxScore}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function VESlider({ label, desc, value, color, tips, isPositive }: {
  label: string; desc: string; value: number; color: string; isPositive: boolean;
  tips: string[]; onChange: (v: number) => void;
}) {
  return (
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>{desc}</div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(v => (
          <div key={v} style={{
            flex: 1, height: 8, borderRadius: 4,
            background: v <= value ? color : '#E2E8F0',
            opacity: v <= value ? (0.4 + (v / 5) * 0.6) : 0.3,
          }} />
        ))}
      </div>
      <div style={{ fontSize: 12, color, marginTop: 4, fontWeight: 500 }}>{tips[value - 1]}</div>
    </div>
  );
}

// ─── メインページ ─────────────────────────────────

type TabId = 'edit' | 'diagnosis' | 'preview';

export default function OfferBuilder() {
  const [offers, setOffers] = useState<SavedOffer[]>([]);
  const [activeOfferId, setActiveOfferId] = useState<string>('');
  const [data, setData] = useState<OfferData>(EMPTY_OFFER);
  const [tab, setTab] = useState<TabId>('edit');
  const [showOfferList, setShowOfferList] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let saved = loadOffers();
    if (saved.length === 0) {
      const first: SavedOffer = {
        id: genId(), name: '新しいオファー', data: EMPTY_OFFER,
        createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      };
      saved = [first];
      saveOffers(saved);
    }
    // migrate old data without valueEquation
    saved = saved.map(o => ({
      ...o,
      data: { ...EMPTY_OFFER, ...o.data, valueEquation: o.data.valueEquation || EMPTY_OFFER.valueEquation },
    }));
    setOffers(saved);
    saveOffers(saved);
    const activeId = localStorage.getItem(ACTIVE_KEY) || saved[0].id;
    const active = saved.find(o => o.id === activeId) || saved[0];
    setActiveOfferId(active.id);
    setData(active.data);
  }, []);

  function update(partial: Partial<OfferData>) {
    const next = { ...data, ...partial };
    setData(next);
    const updated = offers.map(o =>
      o.id === activeOfferId ? { ...o, data: next, updatedAt: new Date().toISOString(), name: next.productName || o.name } : o
    );
    setOffers(updated);
    saveOffers(updated);
  }

  function switchOffer(id: string) {
    const o = offers.find(x => x.id === id);
    if (o) { setActiveOfferId(o.id); setData(o.data); localStorage.setItem(ACTIVE_KEY, o.id); }
    setShowOfferList(false);
  }

  function createOffer(templateData?: OfferData) {
    const o: SavedOffer = {
      id: genId(), name: templateData?.productName || '新しいオファー',
      data: templateData || EMPTY_OFFER,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    const next = [...offers, o];
    setOffers(next);
    saveOffers(next);
    switchOffer(o.id);
    setShowTemplates(false);
  }

  function deleteOffer(id: string) {
    if (offers.length <= 1) return;
    if (!confirm('このオファーを削除しますか？')) return;
    const next = offers.filter(o => o.id !== id);
    setOffers(next);
    saveOffers(next);
    if (activeOfferId === id) switchOffer(next[0].id);
  }

  function copyToClipboard() {
    const lines: string[] = [];
    lines.push(`【${data.productName || 'オファー名'}】`);
    lines.push(data.tagline);
    lines.push('');
    if (data.targetPain) lines.push(`悩み: ${data.targetPain}`);
    if (data.desiredOutcome) lines.push(`得られる結果: ${data.desiredOutcome}`);
    lines.push('');
    lines.push('━━ プラン ━━');
    data.priceTiers.forEach(t => {
      lines.push(`${t.isRecommended ? '★ ' : ''}${t.name}: ¥${t.price}`);
      lines.push(`  ${t.description}`);
      t.includes.filter(Boolean).forEach(inc => lines.push(`  ✓ ${inc}`));
    });
    if (data.anchorPrice) lines.push(`\n通常価格: ${data.anchorPrice}円`);
    if (data.paymentPlans.filter(Boolean).length) lines.push(`支払方法: ${data.paymentPlans.filter(Boolean).join(' / ')}`);
    if (data.bonuses.length) {
      lines.push('\n━━ 特典 ━━');
      data.bonuses.forEach((b, i) => lines.push(`${i + 1}. ${b.name}（${b.value}）: ${b.description}`));
    }
    if (data.urgencyElements.length) {
      lines.push('\n━━ 限定条件 ━━');
      data.urgencyElements.forEach(u => lines.push(`${URGENCY_LABELS[u.type]}: ${u.description}`));
    }
    lines.push(`\nCTA: ${data.ctaText}`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const activeOffer = offers.find(o => o.id === activeOfferId);
  const diagItems = useMemo(() => diagnoseOffer(data), [data]);
  const diagScore = diagItems.reduce((s, i) => s + i.score, 0);
  const diagMax = diagItems.reduce((s, i) => s + i.maxScore, 0);
  const diagPct = diagMax > 0 ? Math.round((diagScore / diagMax) * 100) : 0;

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: '1px solid #E2E8F0', fontSize: 16, outline: 'none',
    boxSizing: 'border-box', background: '#FFF',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>
      {/* ── Header ── */}
      <header style={{ background: '#0F172A', padding: '0 24px', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
              }}>💎</div>
              <div>
                <div style={{ fontSize: 17, fontWeight: 700, color: '#FFF', lineHeight: 1.2 }}>Offer Builder</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>オファー設計ツール</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowTemplates(true)} style={{
                background: '#1E293B', border: '1px solid #334155',
                borderRadius: 8, padding: '8px 16px', color: '#94A3B8', fontSize: 14, cursor: 'pointer', fontWeight: 500,
              }}>+ テンプレート</button>
              <div style={{ position: 'relative' }}>
                {showOfferList && <div onClick={() => setShowOfferList(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}
                <button onClick={() => setShowOfferList(!showOfferList)} style={{
                  background: '#1E293B', border: '1px solid #334155',
                  borderRadius: 8, padding: '8px 16px', color: '#E2E8F0', fontSize: 14, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500,
                }}>
                  {activeOffer?.data.productName || activeOffer?.name || 'オファー'}
                  <span style={{ fontSize: 12, color: '#64748B' }}>▼</span>
                </button>
                {showOfferList && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 6, width: 280,
                    background: '#FFF', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    border: '1px solid #E2E8F0', zIndex: 50, overflow: 'hidden',
                  }}>
                    <div style={{ padding: 8 }}>
                      {offers.map(o => (
                        <div key={o.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8,
                          background: o.id === activeOfferId ? '#F1F5F9' : 'transparent', cursor: 'pointer',
                        }}>
                          <button onClick={() => switchOffer(o.id)} style={{
                            flex: 1, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                            fontSize: 15, fontWeight: o.id === activeOfferId ? 600 : 400,
                            color: o.id === activeOfferId ? '#0F172A' : '#64748B',
                          }}>
                            {o.id === activeOfferId && <span style={{ color: '#6366F1' }}>● </span>}
                            {o.data.productName || o.name}
                          </button>
                          {offers.length > 1 && (
                            <button onClick={() => deleteOffer(o.id)} style={{
                              background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#CBD5E1',
                            }}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: 8, borderTop: '1px solid #F1F5F9' }}>
                      <button onClick={() => createOffer()} style={{
                        width: '100%', padding: 10, borderRadius: 8, background: '#0F172A', color: '#FFF',
                        border: 'none', fontSize: 14, fontWeight: 600, cursor: 'pointer',
                      }}>+ 新しいオファー</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, borderTop: '1px solid #1E293B' }}>
            {([
              { id: 'edit' as TabId, label: '編集' },
              { id: 'diagnosis' as TabId, label: `診断 ${diagPct}点` },
              { id: 'preview' as TabId, label: 'プレビュー' },
            ]).map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '12px 20px', fontSize: 15, fontWeight: 500, background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t.id ? '#FFF' : '#64748B',
                borderBottom: tab === t.id ? '2px solid #6366F1' : '2px solid transparent',
              }}>{t.label}</button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={copyToClipboard} style={{
              padding: '8px 16px', borderRadius: 8, fontSize: 14,
              background: copied ? '#059669' : '#1E293B',
              border: '1px solid ' + (copied ? '#059669' : '#334155'),
              color: copied ? '#FFF' : '#94A3B8', cursor: 'pointer', fontWeight: 500,
            }}>{copied ? '✓ コピー完了' : 'コピー'}</button>
          </div>
        </div>
      </header>

      {/* ── テンプレートモーダル ── */}
      {showTemplates && (
        <>
          <div onClick={() => setShowTemplates(false)} style={{
            position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)', zIndex: 60,
          }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '90%', maxWidth: 500, background: '#FFF', borderRadius: 20, padding: 28, zIndex: 70,
            boxShadow: '0 25px 60px rgba(0,0,0,0.25)',
          }}>
            <h3 style={{ fontSize: 20, fontWeight: 800, margin: '0 0 4px', color: '#0F172A' }}>テンプレートから作成</h3>
            <p style={{ fontSize: 15, color: '#94A3B8', margin: '0 0 20px' }}>目的に合ったテンプレートを選んでカスタマイズ</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {TEMPLATES.map((tmpl, i) => (
                <button key={i} onClick={() => createOffer(tmpl.data)} style={{
                  padding: '18px 20px', borderRadius: 14, border: '1px solid #E2E8F0',
                  background: '#FAFBFC', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, background: '#F1F5F9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
                  }}>{tmpl.icon}</div>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{tmpl.name}</div>
                    <div style={{ fontSize: 14, color: '#94A3B8', marginTop: 2 }}>{tmpl.desc}</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTemplates(false)} style={{
              marginTop: 16, width: '100%', padding: 12, borderRadius: 10, border: '1px solid #E2E8F0',
              background: '#FFF', fontSize: 15, color: '#64748B', cursor: 'pointer', fontWeight: 500,
            }}>閉じる</button>
          </div>
        </>
      )}

      {/* ── Main ── */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px' }}>
        {tab === 'diagnosis' ? (
          <DiagnosticPanel data={data} />
        ) : tab === 'preview' ? (
          <OfferPreview data={data} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <Section title="基本情報" subtitle="商品の概要とメッセージ">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Field label="商品・プログラム名">
                  <input value={data.productName} onChange={e => update({ productName: e.target.value })}
                    placeholder="例: ○○マスタープログラム" style={inputBase} />
                </Field>
                <Field label="キャッチコピー">
                  <input value={data.tagline} onChange={e => update({ tagline: e.target.value })}
                    placeholder="一言で「何が得られるか」を伝える" style={inputBase} />
                </Field>
                <Field label="ターゲットの悩み">
                  <textarea value={data.targetPain} onChange={e => update({ targetPain: e.target.value })}
                    placeholder="この商品が解決する課題（具体的に書くほど診断スコアが上がります）" rows={2}
                    style={{ ...inputBase, resize: 'none' }} />
                </Field>
                <Field label="得られる結果（ベネフィット）">
                  <textarea value={data.desiredOutcome} onChange={e => update({ desiredOutcome: e.target.value })}
                    placeholder="期間・数値・具体的な成果を入れるとスコアアップ" rows={2}
                    style={{ ...inputBase, resize: 'none' }} />
                </Field>
              </div>
            </Section>

            {/* 価値方程式の調整 */}
            <Section title="価値方程式" subtitle="オファーの「価値」を4軸で設計する">
              <div style={{ fontSize: 14, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
                価値 = (理想の結果 × 実現可能性) ÷ (かかる時間 × 必要な労力)<br />
                各項目を調整すると、診断タブでスコアが変わります。スコアを上げるには「結果」と「可能性」を上げるか、「時間」と「労力」を下げるオファー設計を考えてください。
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
                {([
                  { key: 'dreamOutcome' as const, label: '理想の結果の大きさ', desc: '手に入る結果はどのくらい大きいか？', color: '#6366F1', tips: ['ニッチすぎる', '小さい改善', '実用的な成果', '大きな変化', '人生が変わる'] },
                  { key: 'likelihood' as const, label: '達成できる可能性', desc: '実績・証拠・サポートの手厚さ', color: '#059669', tips: ['証拠なし', '理論のみ', '一部成功例', '多数の実績', '再現性が高い'] },
                  { key: 'timeToResult' as const, label: '結果が出る速さ', desc: '早いほど価値が高い', color: '#D97706', tips: ['1年以上', '半年', '3ヶ月', '1ヶ月', '即日〜1週間'] },
                  { key: 'effortRequired' as const, label: '労力の少なさ', desc: '楽なほど価値が高い', color: '#DC2626', tips: ['フルコミット', 'かなり大変', 'それなりに', '手軽', 'ほぼ不要'] },
                ] as const).map(item => (
                  <div key={item.key}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#334155', marginBottom: 2 }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 8 }}>{item.desc}</div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {[1, 2, 3, 4, 5].map(v => (
                        <button key={v} onClick={() => update({ valueEquation: { ...data.valueEquation, [item.key]: v } })}
                          style={{
                            flex: 1, height: 32, borderRadius: 6, border: 'none', cursor: 'pointer',
                            background: v <= data.valueEquation[item.key] ? item.color : '#E2E8F0',
                            opacity: v <= data.valueEquation[item.key] ? (0.5 + (v / 5) * 0.5) : 0.3,
                            transition: 'all 0.15s',
                          }} />
                      ))}
                    </div>
                    <div style={{ fontSize: 13, color: item.color, marginTop: 4, fontWeight: 500 }}>{item.tips[data.valueEquation[item.key] - 1]}</div>
                  </div>
                ))}
              </div>
            </Section>

            <Section title="価格設計" subtitle="松竹梅・アンカー・分割払い">
              <Field label="アンカー価格（この内容なら通常いくらか）">
                <input value={data.anchorPrice} onChange={e => update({ anchorPrice: e.target.value })}
                  placeholder="例: 500,000" style={{ ...inputBase, maxWidth: 240 }} />
              </Field>
              <div style={{ marginTop: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <label style={{ fontSize: 14, fontWeight: 600, color: '#475569' }}>プラン（価格帯）</label>
                  <button onClick={() => update({ priceTiers: [...data.priceTiers, { id: genId(), name: '', price: '', description: '', includes: [''], isRecommended: false }] })}
                    style={{ fontSize: 14, color: '#6366F1', background: '#EEF2FF', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 600 }}>+ プラン追加</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {data.priceTiers.map((tier, ti) => (
                    <div key={tier.id} style={{
                      padding: 20, borderRadius: 14,
                      border: tier.isRecommended ? '2px solid #6366F1' : '1px solid #E2E8F0', background: '#FFF',
                    }}>
                      <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                        <input value={tier.name} onChange={e => { const t = [...data.priceTiers]; t[ti] = { ...t[ti], name: e.target.value }; update({ priceTiers: t }); }}
                          placeholder="プラン名" style={{ ...inputBase, flex: 1 }} />
                        <input value={tier.price} onChange={e => { const t = [...data.priceTiers]; t[ti] = { ...t[ti], price: e.target.value }; update({ priceTiers: t }); }}
                          placeholder="価格" style={{ ...inputBase, width: 140, flex: 'none' }} />
                      </div>
                      <input value={tier.description} onChange={e => { const t = [...data.priceTiers]; t[ti] = { ...t[ti], description: e.target.value }; update({ priceTiers: t }); }}
                        placeholder="プランの説明" style={{ ...inputBase, marginBottom: 12 }} />
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', marginBottom: 6 }}>含まれるもの</div>
                      {tier.includes.map((inc, ii) => (
                        <div key={ii} style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'center' }}>
                          <span style={{ color: '#10B981', fontSize: 14, flexShrink: 0 }}>✓</span>
                          <input value={inc} onChange={e => {
                            const t = [...data.priceTiers]; const incs = [...t[ti].includes]; incs[ii] = e.target.value;
                            t[ti] = { ...t[ti], includes: incs }; update({ priceTiers: t });
                          }} placeholder="含まれる内容" style={{ ...inputBase, padding: '10px 14px', fontSize: 15 }} />
                          <button onClick={() => { const t = [...data.priceTiers]; t[ti] = { ...t[ti], includes: t[ti].includes.filter((_, i) => i !== ii) }; update({ priceTiers: t }); }}
                            style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                        </div>
                      ))}
                      <button onClick={() => { const t = [...data.priceTiers]; t[ti] = { ...t[ti], includes: [...t[ti].includes, ''] }; update({ priceTiers: t }); }}
                        style={{ fontSize: 14, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ 項目追加</button>
                      <div style={{ display: 'flex', gap: 12, marginTop: 12, borderTop: '1px solid #F1F5F9', paddingTop: 12 }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: '#64748B', cursor: 'pointer' }}>
                          <input type="checkbox" checked={tier.isRecommended} onChange={e => {
                            const t = data.priceTiers.map((p, i) => ({ ...p, isRecommended: i === ti ? e.target.checked : false }));
                            update({ priceTiers: t });
                          }} style={{ accentColor: '#6366F1' }} /> おすすめに設定
                        </label>
                        {data.priceTiers.length > 1 && (
                          <button onClick={() => update({ priceTiers: data.priceTiers.filter((_, i) => i !== ti) })}
                            style={{ marginLeft: 'auto', fontSize: 14, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>削除</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ marginTop: 16 }}>
                <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>分割払いオプション</label>
                {data.paymentPlans.map((plan, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                    <input value={plan} onChange={e => { const p = [...data.paymentPlans]; p[i] = e.target.value; update({ paymentPlans: p }); }}
                      placeholder="例: 3回分割" style={{ ...inputBase, flex: 1 }} />
                    <button onClick={() => update({ paymentPlans: data.paymentPlans.filter((_, ii) => ii !== i) })}
                      style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                ))}
                <button onClick={() => update({ paymentPlans: [...data.paymentPlans, ''] })}
                  style={{ fontSize: 14, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>+ 分割オプション追加</button>
              </div>
            </Section>

            <Section title="特典スタッキング" subtitle="本体の価値を補強する特典を設計">
              {data.bonuses.map((bonus, i) => (
                <div key={bonus.id} style={{
                  padding: 18, borderRadius: 14, border: '1px solid #FDE68A', background: '#FFFBEB', marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                    <input value={bonus.name} onChange={e => { const b = [...data.bonuses]; b[i] = { ...b[i], name: e.target.value }; update({ bonuses: b }); }}
                      placeholder="特典名" style={{ ...inputBase, flex: 1, background: '#FFF', borderColor: '#FDE68A' }} />
                    <input value={bonus.value} onChange={e => { const b = [...data.bonuses]; b[i] = { ...b[i], value: e.target.value }; update({ bonuses: b }); }}
                      placeholder="価値（例: 29,800円相当）" style={{ ...inputBase, width: 170, flex: 'none', background: '#FFF', borderColor: '#FDE68A' }} />
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input value={bonus.description} onChange={e => { const b = [...data.bonuses]; b[i] = { ...b[i], description: e.target.value }; update({ bonuses: b }); }}
                      placeholder="特典の説明" style={{ ...inputBase, flex: 1, fontSize: 15, background: '#FFF', borderColor: '#FDE68A' }} />
                    <button onClick={() => update({ bonuses: data.bonuses.filter((_, ii) => ii !== i) })}
                      style={{ background: 'none', border: 'none', color: '#D97706', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                  </div>
                </div>
              ))}
              <button onClick={() => update({ bonuses: [...data.bonuses, { id: genId(), name: '', description: '', value: '' }] })}
                style={{ fontSize: 14, color: '#B45309', background: '#FEF3C7', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>+ 特典を追加</button>
            </Section>

            <Section title="緊急性・希少性" subtitle="今すぐ行動する理由を作る">
              {data.urgencyElements.map((u, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10, alignItems: 'center' }}>
                  <select value={u.type} onChange={e => { const els = [...data.urgencyElements]; els[i] = { ...els[i], type: e.target.value as Urgency['type'] }; update({ urgencyElements: els }); }}
                    style={{ ...inputBase, width: 140, flex: 'none', padding: '12px 14px', fontSize: 15 }}>
                    {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input value={u.description} onChange={e => { const els = [...data.urgencyElements]; els[i] = { ...els[i], description: e.target.value }; update({ urgencyElements: els }); }}
                    placeholder="詳細" style={{ ...inputBase, flex: 1 }} />
                  <button onClick={() => update({ urgencyElements: data.urgencyElements.filter((_, ii) => ii !== i) })}
                    style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                </div>
              ))}
              <button onClick={() => update({ urgencyElements: [...data.urgencyElements, { type: 'deadline', description: '' }] })}
                style={{ fontSize: 14, color: '#E11D48', background: '#FFF1F2', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>+ 緊急性を追加</button>
            </Section>

            <Section title="CTA（行動喚起）" subtitle="ボタンに表示するテキスト">
              <Field label="CTAボタンのテキスト">
                <input value={data.ctaText} onChange={e => update({ ctaText: e.target.value })}
                  placeholder="例: 今すぐ申し込む" style={inputBase} />
              </Field>
            </Section>

            <Section title="メモ" subtitle="オファー設計に関する考慮事項">
              <textarea value={data.notes} onChange={e => update({ notes: e.target.value })}
                placeholder="A/Bテストの結果やアイデアなどをメモ" rows={3}
                style={{ ...inputBase, resize: 'none' }} />
            </Section>
          </div>
        )}
      </main>
    </div>
  );
}

// ─── プレビュー ──────────────────────────────────

function OfferPreview({ data }: { data: OfferData }) {
  const totalBonus = data.bonuses.reduce((sum, b) => {
    const match = b.value.replace(/,/g, '').match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  return (
    <div style={{ background: '#FFF', borderRadius: 20, overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
      <div style={{
        background: '#0F172A', padding: '48px 32px 40px', color: '#FFF', textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          {data.productName && (
            <div style={{ display: 'inline-block', fontSize: 13, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.15em', marginBottom: 12, padding: '6px 18px', border: '1px solid #334155', borderRadius: 100 }}>{data.productName}</div>
          )}
          <h2 style={{ fontSize: 30, fontWeight: 800, margin: '12px 0 0', lineHeight: 1.5, background: 'linear-gradient(135deg, #FFF 0%, #CBD5E1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            {data.tagline || 'キャッチコピーを入力してください'}
          </h2>
          {data.targetPain && (
            <p style={{ fontSize: 16, color: '#94A3B8', margin: '16px auto 0', maxWidth: 500, lineHeight: 1.7 }}>
              「{data.targetPain}」その悩み、解決できます
            </p>
          )}
        </div>
      </div>

      {data.desiredOutcome && (
        <div style={{ margin: '0 24px', marginTop: -20, padding: '20px 24px', borderRadius: 14, background: 'linear-gradient(135deg, #F0FDF4, #ECFDF5)', border: '1px solid #BBF7D0', position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', letterSpacing: '0.08em', marginBottom: 6 }}>OUTCOME</div>
          <p style={{ fontSize: 16, color: '#15803D', margin: 0, lineHeight: 1.7, fontWeight: 500 }}>{data.desiredOutcome}</p>
        </div>
      )}

      {data.priceTiers.length > 0 && (
        <div style={{ padding: '32px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h4 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', margin: 0 }}>プラン & 価格</h4>
            {data.anchorPrice && (
              <p style={{ fontSize: 15, color: '#94A3B8', marginTop: 8 }}>
                通常価格 <span style={{ textDecoration: 'line-through', color: '#EF4444', fontWeight: 600 }}>{data.anchorPrice}円</span>
              </p>
            )}
          </div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: data.priceTiers.length === 1 ? '1fr' : data.priceTiers.length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 16, maxWidth: data.priceTiers.length === 1 ? 360 : 'none', margin: '0 auto',
          }}>
            {data.priceTiers.map(tier => (
              <div key={tier.id} style={{
                borderRadius: 16, overflow: 'hidden', border: tier.isRecommended ? '2px solid #6366F1' : '1px solid #E2E8F0',
                background: tier.isRecommended ? '#FFF' : '#FAFBFC',
                boxShadow: tier.isRecommended ? '0 8px 30px rgba(99,102,241,0.15)' : 'none',
                transform: tier.isRecommended ? 'scale(1.03)' : 'none',
              }}>
                {tier.isRecommended && (
                  <div style={{ background: '#6366F1', color: '#FFF', textAlign: 'center', fontSize: 13, fontWeight: 700, padding: '6px 0', letterSpacing: '0.12em' }}>RECOMMENDED</div>
                )}
                <div style={{ padding: '24px 20px' }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#334155', marginBottom: 8 }}>{tier.name}</div>
                  <div style={{ marginBottom: 12 }}>
                    <span style={{ fontSize: 36, fontWeight: 800, color: '#0F172A' }}>
                      <span style={{ fontSize: 18, fontWeight: 500, color: '#64748B' }}>¥</span>{tier.price || '—'}
                    </span>
                  </div>
                  <p style={{ fontSize: 14, color: '#64748B', marginBottom: 16, lineHeight: 1.5 }}>{tier.description}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {tier.includes.filter(Boolean).map((item, i) => (
                      <div key={i} style={{ fontSize: 15, color: '#334155', display: 'flex', gap: 8 }}>
                        <span style={{ color: '#10B981', fontSize: 16, flexShrink: 0 }}>✓</span>
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {data.paymentPlans.filter(Boolean).length > 0 && (
            <p style={{ textAlign: 'center', fontSize: 14, color: '#94A3B8', marginTop: 16 }}>
              {data.paymentPlans.filter(Boolean).join(' / ')}
            </p>
          )}
        </div>
      )}

      {data.bonuses.length > 0 && (
        <div style={{ padding: '0 24px 32px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ display: 'inline-block', fontSize: 13, fontWeight: 700, color: '#B45309', letterSpacing: '0.12em', padding: '6px 18px', background: '#FEF3C7', borderRadius: 100, marginBottom: 8 }}>BONUS</div>
            <h4 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>今だけの特別特典</h4>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {data.bonuses.map((bonus, i) => (
              <div key={bonus.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '16px 20px', background: '#FFFBEB', borderRadius: 14, border: '1px solid #FDE68A' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #F59E0B, #D97706)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#78350F' }}>{bonus.name}</div>
                  <div style={{ fontSize: 14, color: '#92400E', lineHeight: 1.5, marginTop: 2 }}>{bonus.description}</div>
                </div>
                {bonus.value && <div style={{ fontSize: 13, fontWeight: 700, color: '#B45309', flexShrink: 0, padding: '6px 12px', background: '#FDE68A', borderRadius: 6 }}>{bonus.value}</div>}
              </div>
            ))}
          </div>
          {totalBonus > 0 && <p style={{ textAlign: 'center', fontSize: 17, fontWeight: 800, color: '#92400E', marginTop: 16 }}>特典総額 {totalBonus.toLocaleString()}円相当</p>}
        </div>
      )}

      {data.urgencyElements.length > 0 && (
        <div style={{ padding: '20px 24px', background: '#FFF1F2', borderTop: '1px solid #FECDD3' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
            {data.urgencyElements.map((u, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: '#FFF', borderRadius: 10, border: '1px solid #FECDD3' }}>
                <span style={{ fontSize: 16 }}>{URGENCY_ICONS[u.type] || '⚡'}</span>
                <span style={{ fontSize: 15, color: '#9F1239', fontWeight: 600 }}>{u.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: '32px 24px', textAlign: 'center', background: '#FAFBFC' }}>
        <div style={{
          display: 'inline-block', padding: '16px 56px', borderRadius: 14,
          background: '#0F172A', color: '#FFF', fontSize: 18, fontWeight: 800,
          boxShadow: '0 4px 20px rgba(15,23,42,0.3)',
        }}>
          {data.ctaText || '今すぐ申し込む'}
        </div>
      </div>
    </div>
  );
}

// ─── 編集用コンポーネント ────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFF', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>{title}</h3>
        <span style={{ fontSize: 14, color: '#94A3B8' }}>{subtitle}</span>
      </div>
      <div style={{ padding: 24 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 8 }}>{label}</label>
      {children}
    </div>
  );
}
