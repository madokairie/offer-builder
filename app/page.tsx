'use client';

import { useState, useEffect } from 'react';

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

interface Guarantee {
  type: 'full-refund' | 'conditional' | 'results-based' | 'custom';
  period: string;
  condition: string;
}

interface Urgency {
  type: 'deadline' | 'limited-spots' | 'early-bird' | 'price-increase' | 'custom';
  description: string;
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
  totalBonusValue: string;
  guarantee: Guarantee;
  urgencyElements: Urgency[];
  ctaText: string;
  notes: string;
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
  totalBonusValue: '',
  guarantee: { type: 'full-refund', period: '30日間', condition: '理由を問わず全額返金' },
  urgencyElements: [],
  ctaText: '今すぐ申し込む',
  notes: '',
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
    name: 'チャレンジ型（低単価→高単価）',
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
      guarantee: { type: 'full-refund' as const, period: '7日間', condition: 'チャレンジ開始後7日以内なら全額返金' },
      urgencyElements: [
        { type: 'deadline' as const, description: '○月○日 23:59まで' },
        { type: 'limited-spots' as const, description: '先着100名限定' },
      ],
    },
  },
  {
    name: 'セミナー型（高単価）',
    data: {
      ...EMPTY_OFFER,
      tagline: '△△を実現する完全マスタープログラム',
      priceTiers: [
        { id: genId(), name: 'ベーシック', price: '198,000', description: '動画教材＋基本サポート', includes: ['全モジュール動画', 'ワークブック', 'メールサポート3ヶ月'], isRecommended: false },
        { id: genId(), name: 'プレミアム', price: '398,000', description: '個別コンサル＋グループコーチング付き', includes: ['ベーシック全内容', '個別コンサル月1回', 'グループコーチング週1回', 'チャットサポート無制限', '追加教材・アップデート永久アクセス'], isRecommended: true },
        { id: genId(), name: 'VIP', price: '798,000', description: '完全マンツーマン＋代行サポート', includes: ['プレミアム全内容', '個別コンサル月2回', '一部作業代行', '優先サポート', '次期プログラム無料招待'], isRecommended: false },
      ],
      paymentPlans: ['一括払い', '3回分割', '6回分割', '12回分割'],
      bonuses: [
        { id: genId(), name: '個別戦略セッション', description: '申込後30日以内に1on1で戦略を策定', value: '50,000円相当' },
        { id: genId(), name: '成功事例テンプレート集', description: '実際に成果を出した受講生のテンプレートを完全公開', value: '29,800円相当' },
        { id: genId(), name: 'ツール設定マニュアル', description: '必要なツールの設定を画面録画で完全解説', value: '19,800円相当' },
      ],
      guarantee: { type: 'conditional' as const, period: '90日間', condition: '全カリキュラムを実践し成果が出なかった場合、全額返金' },
      urgencyElements: [
        { type: 'deadline' as const, description: 'セミナー後72時間以内の申込限定' },
        { type: 'early-bird' as const, description: '本日中の申込で○○万円OFF' },
        { type: 'limited-spots' as const, description: '個別対応のため月5名限定' },
      ],
    },
  },
  {
    name: 'サブスク型（月額）',
    data: {
      ...EMPTY_OFFER,
      tagline: '月額○○円で△△し放題',
      priceTiers: [
        { id: genId(), name: '月額プラン', price: '9,800/月', description: '全コンテンツへのアクセス', includes: ['新コンテンツ毎月追加', 'コミュニティアクセス', '月1回のグループコール'], isRecommended: false },
        { id: genId(), name: '年額プラン', price: '98,000/年', description: '2ヶ月分お得な年間プラン', includes: ['月額プラン全内容', '年額限定ボーナス教材', '優先サポート'], isRecommended: true },
      ],
      guarantee: { type: 'full-refund' as const, period: '14日間', condition: '入会後14日以内なら全額返金。いつでも解約可能' },
      urgencyElements: [
        { type: 'price-increase' as const, description: '現在の価格は創設メンバー限定。次期から値上げ予定' },
      ],
    },
  },
];

// ─── ラベル定義 ─────────────────────────────────

const GUARANTEE_LABELS: Record<string, string> = {
  'full-refund': '全額返金保証',
  'conditional': '条件付き返金保証',
  'results-based': '成果保証',
  'custom': 'カスタム保証',
};

const URGENCY_LABELS: Record<string, string> = {
  'deadline': '期間限定',
  'limited-spots': '人数限定',
  'early-bird': '早期割引',
  'price-increase': '値上げ予告',
  'custom': 'その他',
};

// ─── 汎用コンポーネント ──────────────────────────

function Input({ label, value, onChange, placeholder, multiline, small }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; multiline?: boolean; small?: boolean;
}) {
  const style: React.CSSProperties = {
    width: '100%', padding: small ? '6px 10px' : '10px 14px', borderRadius: 8,
    border: '1px solid #D1D5DB', fontSize: small ? 13 : 14, resize: 'none',
    outline: 'none', boxSizing: 'border-box',
  };
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{label}</label>
      {multiline ? (
        <textarea rows={3} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />
      ) : (
        <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={style} />
      )}
    </div>
  );
}

function SectionCard({ title, icon, children, color = '#6366F1' }: {
  title: string; icon: string; children: React.ReactNode; color?: string;
}) {
  return (
    <div style={{
      background: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 20,
      border: '1px solid #E5E7EB', boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: '#111827', margin: 0 }}>{title}</h3>
        <div style={{ width: 40, height: 3, borderRadius: 2, background: color, marginLeft: 'auto' }} />
      </div>
      <div style={{ padding: 20 }}>{children}</div>
    </div>
  );
}

// ─── オファーシートプレビュー ─────────────────────

function OfferPreview({ data }: { data: OfferData }) {
  const totalBonus = data.bonuses.reduce((sum, b) => {
    const match = b.value.replace(/,/g, '').match(/(\d+)/);
    return sum + (match ? parseInt(match[1]) : 0);
  }, 0);

  return (
    <div style={{ background: '#FFF', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
        padding: '32px 24px', color: '#FFF', textAlign: 'center',
      }}>
        <p style={{ fontSize: 13, color: '#A5B4FC', margin: '0 0 8px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {data.productName || 'プロダクト名'}
        </p>
        <h2 style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', lineHeight: 1.4 }}>
          {data.tagline || 'キャッチコピーを入力'}
        </h2>
        {data.targetPain && (
          <p style={{ fontSize: 13, color: '#C7D2FE', margin: '12px 0 0' }}>
            {data.targetPain}という悩みを抱えていませんか？
          </p>
        )}
      </div>

      {data.desiredOutcome && (
        <div style={{ padding: '20px 24px', background: '#F0FDF4', borderBottom: '1px solid #D1FAE5' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#059669', marginBottom: 6 }}>このプログラムで得られる結果</div>
          <p style={{ fontSize: 14, color: '#065F46', margin: 0, lineHeight: 1.6 }}>{data.desiredOutcome}</p>
        </div>
      )}

      {data.priceTiers.length > 0 && (
        <div style={{ padding: 24 }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16, textAlign: 'center' }}>プラン & 価格</h4>
          {data.anchorPrice && (
            <p style={{ textAlign: 'center', fontSize: 13, color: '#6B7280', marginBottom: 16 }}>
              通常価格: <span style={{ textDecoration: 'line-through', color: '#DC2626' }}>{data.anchorPrice}円</span>
            </p>
          )}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center' }}>
            {data.priceTiers.map(tier => (
              <div key={tier.id} style={{
                flex: '1 1 200px', maxWidth: 280, borderRadius: 12, overflow: 'hidden',
                border: tier.isRecommended ? '2px solid #6366F1' : '1px solid #E5E7EB', position: 'relative',
              }}>
                {tier.isRecommended && (
                  <div style={{ background: '#6366F1', color: '#FFF', textAlign: 'center', fontSize: 10, fontWeight: 700, padding: '4px 0', letterSpacing: '0.1em' }}>おすすめ</div>
                )}
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{tier.name}</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 4 }}>
                    <span style={{ fontSize: 14, fontWeight: 400 }}>¥</span>{tier.price || '—'}
                  </div>
                  <p style={{ fontSize: 12, color: '#6B7280', marginBottom: 12 }}>{tier.description}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {tier.includes.filter(Boolean).map((item, i) => (
                      <div key={i} style={{ fontSize: 12, color: '#374151', display: 'flex', gap: 6 }}>
                        <span style={{ color: '#10B981' }}>✓</span> {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {data.paymentPlans.filter(Boolean).length > 0 && (
            <p style={{ textAlign: 'center', fontSize: 12, color: '#6B7280', marginTop: 12 }}>
              お支払い方法: {data.paymentPlans.filter(Boolean).join(' / ')}
            </p>
          )}
        </div>
      )}

      {data.bonuses.length > 0 && (
        <div style={{ padding: '0 24px 24px' }}>
          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>今だけの特別特典</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.bonuses.map((bonus, i) => (
              <div key={bonus.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                background: '#FEF3C7', borderRadius: 10, border: '1px solid #FDE68A',
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: '#F59E0B', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0,
                }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#92400E' }}>{bonus.name}</div>
                  <div style={{ fontSize: 11, color: '#78350F' }}>{bonus.description}</div>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#B45309', flexShrink: 0 }}>{bonus.value}</div>
              </div>
            ))}
          </div>
          {totalBonus > 0 && (
            <p style={{ textAlign: 'center', fontSize: 14, fontWeight: 700, color: '#B45309', marginTop: 12 }}>
              特典総額: {totalBonus.toLocaleString()}円相当
            </p>
          )}
        </div>
      )}

      {data.guarantee.condition && (
        <div style={{ padding: '16px 24px', background: '#EFF6FF', borderTop: '1px solid #BFDBFE', borderBottom: '1px solid #BFDBFE' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 28 }}>🛡️</span>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1E40AF' }}>{GUARANTEE_LABELS[data.guarantee.type]}（{data.guarantee.period}）</div>
              <div style={{ fontSize: 12, color: '#1E3A8A' }}>{data.guarantee.condition}</div>
            </div>
          </div>
        </div>
      )}

      {data.urgencyElements.length > 0 && (
        <div style={{ padding: '16px 24px', background: '#FEF2F2', borderBottom: '1px solid #FECACA' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {data.urgencyElements.map((u, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                background: '#FFF', borderRadius: 8, border: '1px solid #FECACA',
              }}>
                <span style={{ color: '#DC2626', fontWeight: 700, fontSize: 12 }}>
                  {u.type === 'deadline' ? '⏰' : u.type === 'limited-spots' ? '🔥' : u.type === 'early-bird' ? '🎯' : u.type === 'price-increase' ? '📈' : '⚡'}
                </span>
                <span style={{ fontSize: 12, color: '#991B1B', fontWeight: 600 }}>{u.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{
          display: 'inline-block', padding: '14px 48px', borderRadius: 12,
          background: 'linear-gradient(135deg, #DC2626, #B91C1C)', color: '#FFF',
          fontSize: 16, fontWeight: 800, letterSpacing: '0.02em',
          boxShadow: '0 4px 14px rgba(220, 38, 38, 0.4)',
        }}>
          {data.ctaText || '今すぐ申し込む'}
        </div>
      </div>
    </div>
  );
}

// ─── メインページ ─────────────────────────────────

type TabId = 'edit' | 'preview';

export default function OfferBuilder() {
  const [offers, setOffers] = useState<SavedOffer[]>([]);
  const [activeOfferId, setActiveOfferId] = useState<string>('');
  const [data, setData] = useState<OfferData>(EMPTY_OFFER);
  const [tab, setTab] = useState<TabId>('edit');
  const [showOfferList, setShowOfferList] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);

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
    setOffers(saved);
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
    lines.push(`\n━━ 保証 ━━\n${GUARANTEE_LABELS[data.guarantee.type]}（${data.guarantee.period}）\n${data.guarantee.condition}`);
    if (data.urgencyElements.length) {
      lines.push('\n━━ 限定条件 ━━');
      data.urgencyElements.forEach(u => lines.push(`${URGENCY_LABELS[u.type]}: ${u.description}`));
    }
    lines.push(`\nCTA: ${data.ctaText}`);
    navigator.clipboard.writeText(lines.join('\n'));
    alert('オファーシートをクリップボードにコピーしました');
  }

  const activeOffer = offers.find(o => o.id === activeOfferId);

  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      {/* Header */}
      <header style={{
        background: 'linear-gradient(135deg, #4C1D95 0%, #6D28D9 50%, #7C3AED 100%)',
        padding: '24px 24px 20px', color: '#FFF',
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Offer Builder</h1>
              <p style={{ fontSize: 12, color: '#C4B5FD', margin: '4px 0 0' }}>売れるオファーを設計する</p>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => setShowTemplates(!showTemplates)} style={{
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                borderRadius: 8, padding: '6px 14px', color: '#E9D5FF', fontSize: 12, cursor: 'pointer',
              }}>テンプレート</button>
              <div style={{ position: 'relative' }}>
                {showOfferList && <div onClick={() => setShowOfferList(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />}
                <button onClick={() => setShowOfferList(!showOfferList)} style={{
                  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 8, padding: '6px 14px', color: '#E9D5FF', fontSize: 12, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  📄 {activeOffer?.name || data.productName || 'オファー'} ▼
                </button>
                {showOfferList && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: 8, width: 260,
                    background: '#FFF', borderRadius: 12, boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                    border: '1px solid #E5E7EB', zIndex: 50, overflow: 'hidden',
                  }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #F3F4F6' }}>
                      {offers.map(o => (
                        <div key={o.id} style={{
                          display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 6,
                          background: o.id === activeOfferId ? '#EDE9FE' : 'transparent', cursor: 'pointer', marginBottom: 2,
                        }}>
                          <button onClick={() => switchOffer(o.id)} style={{
                            flex: 1, background: 'none', border: 'none', textAlign: 'left', cursor: 'pointer',
                            fontSize: 13, fontWeight: o.id === activeOfferId ? 700 : 400,
                            color: o.id === activeOfferId ? '#6D28D9' : '#374151',
                          }}>{o.id === activeOfferId && '● '}{o.data.productName || o.name}</button>
                          {offers.length > 1 && (
                            <button onClick={() => deleteOffer(o.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: '#9CA3AF' }}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <div style={{ padding: '8px 16px' }}>
                      <button onClick={() => createOffer()} style={{
                        width: '100%', padding: '8px', borderRadius: 6, background: '#6D28D9', color: '#FFF',
                        border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>+ 新しいオファー</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 0 }}>
            {(['edit', 'preview'] as TabId[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 20px', fontSize: 13, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer',
                color: tab === t ? '#FFF' : 'rgba(255,255,255,0.5)',
                borderBottom: tab === t ? '2px solid #FFF' : '2px solid transparent',
              }}>{t === 'edit' ? '✏️ 編集' : '👁 プレビュー'}</button>
            ))}
            <button onClick={copyToClipboard} style={{
              marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, fontSize: 12,
              background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
              color: '#E9D5FF', cursor: 'pointer', fontWeight: 600,
            }}>📋 コピー</button>
          </div>
        </div>
      </header>

      {/* テンプレートモーダル */}
      {showTemplates && (
        <>
          <div onClick={() => setShowTemplates(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 60 }} />
          <div style={{
            position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            width: '90%', maxWidth: 600, background: '#FFF', borderRadius: 16, padding: 24, zIndex: 70,
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 16px', color: '#111827' }}>テンプレートから作成</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {TEMPLATES.map((tmpl, i) => (
                <button key={i} onClick={() => createOffer(tmpl.data)} style={{
                  padding: '16px 20px', borderRadius: 12, border: '1px solid #E5E7EB',
                  background: '#F9FAFB', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, background: '#EDE9FE',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0,
                  }}>{i === 0 ? '🏃' : i === 1 ? '🎤' : '🔄'}</div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{tmpl.name}</div>
                    <div style={{ fontSize: 12, color: '#6B7280' }}>{tmpl.data.tagline}</div>
                  </div>
                </button>
              ))}
            </div>
            <button onClick={() => setShowTemplates(false)} style={{
              marginTop: 16, width: '100%', padding: 10, borderRadius: 8, border: '1px solid #D1D5DB',
              background: '#FFF', fontSize: 13, color: '#6B7280', cursor: 'pointer',
            }}>閉じる</button>
          </div>
        </>
      )}

      {/* Main */}
      <main style={{ maxWidth: 960, margin: '0 auto', padding: '24px 24px 80px' }}>
        {tab === 'preview' ? (
          <OfferPreview data={data} />
        ) : (
          <div>
            <SectionCard title="基本情報" icon="📝" color="#6D28D9">
              <Input label="商品・プログラム名" value={data.productName} onChange={v => update({ productName: v })} placeholder="例: ○○マスタープログラム" />
              <Input label="キャッチコピー（一言で何が得られるか）" value={data.tagline} onChange={v => update({ tagline: v })} placeholder="例: 3ヶ月で月商100万円を実現するロードマップ" />
              <Input label="ターゲットの悩み" value={data.targetPain} onChange={v => update({ targetPain: v })} placeholder="例: 集客が安定せず、売上が読めない" multiline />
              <Input label="得られる結果（ベネフィット）" value={data.desiredOutcome} onChange={v => update({ desiredOutcome: v })} placeholder="例: 安定した集客導線と毎月の売上の仕組みが手に入る" multiline />
            </SectionCard>

            <SectionCard title="価格設計" icon="💰" color="#059669">
              <Input label="アンカー価格（通常ならいくらの価値か）" value={data.anchorPrice} onChange={v => update({ anchorPrice: v })} placeholder="例: 500,000" small />
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>プラン（価格帯）</label>
                  <button onClick={() => update({ priceTiers: [...data.priceTiers, { id: genId(), name: '', price: '', description: '', includes: [''], isRecommended: false }] })}
                    style={{ fontSize: 11, color: '#059669', background: '#D1FAE5', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>+ プラン追加</button>
                </div>
                {data.priceTiers.map((tier, ti) => (
                  <div key={tier.id} style={{
                    padding: 16, borderRadius: 10, border: tier.isRecommended ? '2px solid #6366F1' : '1px solid #E5E7EB',
                    marginBottom: 8, background: tier.isRecommended ? '#F5F3FF' : '#FFF', position: 'relative',
                  }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input value={tier.name} onChange={e => { const t = [...data.priceTiers]; t[ti] = { ...t[ti], name: e.target.value }; update({ priceTiers: t }); }}
                        placeholder="プラン名" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13 }} />
                      <input value={tier.price} onChange={e => { const t = [...data.priceTiers]; t[ti] = { ...t[ti], price: e.target.value }; update({ priceTiers: t }); }}
                        placeholder="価格" style={{ width: 120, padding: '6px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13 }} />
                    </div>
                    <input value={tier.description} onChange={e => { const t = [...data.priceTiers]; t[ti] = { ...t[ti], description: e.target.value }; update({ priceTiers: t }); }}
                      placeholder="プラン説明" style={{ width: '100%', padding: '6px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13, marginBottom: 8, boxSizing: 'border-box' }} />
                    <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>含まれるもの:</div>
                    {tier.includes.map((inc, ii) => (
                      <div key={ii} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                        <span style={{ color: '#10B981', fontSize: 13, lineHeight: '28px' }}>✓</span>
                        <input value={inc} onChange={e => {
                          const t = [...data.priceTiers]; const incs = [...t[ti].includes]; incs[ii] = e.target.value;
                          t[ti] = { ...t[ti], includes: incs }; update({ priceTiers: t });
                        }} placeholder="含まれる内容" style={{ flex: 1, padding: '4px 8px', borderRadius: 6, border: '1px solid #E5E7EB', fontSize: 12 }} />
                        <button onClick={() => { const t = [...data.priceTiers]; t[ti] = { ...t[ti], includes: t[ti].includes.filter((_, i) => i !== ii) }; update({ priceTiers: t }); }}
                          style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer', fontSize: 14 }}>✕</button>
                      </div>
                    ))}
                    <button onClick={() => { const t = [...data.priceTiers]; t[ti] = { ...t[ti], includes: [...t[ti].includes, ''] }; update({ priceTiers: t }); }}
                      style={{ fontSize: 11, color: '#6366F1', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0' }}>+ 項目追加</button>
                    <div style={{ display: 'flex', gap: 8, marginTop: 8, borderTop: '1px solid #F3F4F6', paddingTop: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#6B7280', cursor: 'pointer' }}>
                        <input type="checkbox" checked={tier.isRecommended} onChange={e => {
                          const t = data.priceTiers.map((p, i) => ({ ...p, isRecommended: i === ti ? e.target.checked : false }));
                          update({ priceTiers: t });
                        }} /> おすすめに設定
                      </label>
                      {data.priceTiers.length > 1 && (
                        <button onClick={() => update({ priceTiers: data.priceTiers.filter((_, i) => i !== ti) })}
                          style={{ marginLeft: 'auto', fontSize: 11, color: '#DC2626', background: 'none', border: 'none', cursor: 'pointer' }}>削除</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>分割払いオプション</label>
                {data.paymentPlans.map((plan, i) => (
                  <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 4 }}>
                    <input value={plan} onChange={e => { const p = [...data.paymentPlans]; p[i] = e.target.value; update({ paymentPlans: p }); }}
                      placeholder="例: 3回分割" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 13 }} />
                    <button onClick={() => update({ paymentPlans: data.paymentPlans.filter((_, ii) => ii !== i) })}
                      style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
                <button onClick={() => update({ paymentPlans: [...data.paymentPlans, ''] })}
                  style={{ fontSize: 11, color: '#059669', background: 'none', border: 'none', cursor: 'pointer' }}>+ 分割オプション追加</button>
              </div>
            </SectionCard>

            <SectionCard title="特典スタッキング" icon="🎁" color="#F59E0B">
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px' }}>
                特典は「本体の価値を補強する」もの。数より質。購入への最後のひと押しになるものを設計
              </p>
              {data.bonuses.map((bonus, i) => (
                <div key={bonus.id} style={{ padding: 14, borderRadius: 10, border: '1px solid #FDE68A', background: '#FFFBEB', marginBottom: 8 }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input value={bonus.name} onChange={e => { const b = [...data.bonuses]; b[i] = { ...b[i], name: e.target.value }; update({ bonuses: b }); }}
                      placeholder="特典名" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #FDE68A', fontSize: 13 }} />
                    <input value={bonus.value} onChange={e => { const b = [...data.bonuses]; b[i] = { ...b[i], value: e.target.value }; update({ bonuses: b }); }}
                      placeholder="価値（例: 29,800円相当）" style={{ width: 160, padding: '6px 10px', borderRadius: 6, border: '1px solid #FDE68A', fontSize: 13 }} />
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input value={bonus.description} onChange={e => { const b = [...data.bonuses]; b[i] = { ...b[i], description: e.target.value }; update({ bonuses: b }); }}
                      placeholder="特典の説明" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #FDE68A', fontSize: 12 }} />
                    <button onClick={() => update({ bonuses: data.bonuses.filter((_, ii) => ii !== i) })}
                      style={{ background: 'none', border: 'none', color: '#D97706', cursor: 'pointer', fontSize: 14 }}>✕</button>
                  </div>
                </div>
              ))}
              <button onClick={() => update({ bonuses: [...data.bonuses, { id: genId(), name: '', description: '', value: '' }] })}
                style={{ fontSize: 12, color: '#D97706', background: '#FEF3C7', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>+ 特典を追加</button>
            </SectionCard>

            <SectionCard title="保証（リスクリバーサル）" icon="🛡️" color="#2563EB">
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px' }}>「購入のリスクを売り手が負う」ことで購入障壁を下げる</p>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 4 }}>保証タイプ</label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {Object.entries(GUARANTEE_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => update({ guarantee: { ...data.guarantee, type: key as Guarantee['type'] } })} style={{
                      padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      background: data.guarantee.type === key ? '#DBEAFE' : '#F3F4F6',
                      color: data.guarantee.type === key ? '#1E40AF' : '#6B7280',
                      border: data.guarantee.type === key ? '1px solid #93C5FD' : '1px solid #E5E7EB',
                    }}>{label}</button>
                  ))}
                </div>
              </div>
              <Input label="保証期間" value={data.guarantee.period} onChange={v => update({ guarantee: { ...data.guarantee, period: v } })} placeholder="例: 30日間" small />
              <Input label="保証条件・内容" value={data.guarantee.condition} onChange={v => update({ guarantee: { ...data.guarantee, condition: v } })} placeholder="例: 全カリキュラムを実践し成果が出なかった場合、全額返金" multiline />
            </SectionCard>

            <SectionCard title="緊急性・希少性" icon="⏰" color="#DC2626">
              <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 12px' }}>「今すぐ行動する理由」を作る。嘘のない範囲で設計する</p>
              {data.urgencyElements.map((u, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <select value={u.type} onChange={e => { const els = [...data.urgencyElements]; els[i] = { ...els[i], type: e.target.value as Urgency['type'] }; update({ urgencyElements: els }); }}
                    style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 12, width: 120 }}>
                    {Object.entries(URGENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                  <input value={u.description} onChange={e => { const els = [...data.urgencyElements]; els[i] = { ...els[i], description: e.target.value }; update({ urgencyElements: els }); }}
                    placeholder="詳細" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #D1D5DB', fontSize: 12 }} />
                  <button onClick={() => update({ urgencyElements: data.urgencyElements.filter((_, ii) => ii !== i) })}
                    style={{ background: 'none', border: 'none', color: '#D1D5DB', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button onClick={() => update({ urgencyElements: [...data.urgencyElements, { type: 'deadline', description: '' }] })}
                style={{ fontSize: 12, color: '#DC2626', background: '#FEF2F2', border: 'none', borderRadius: 6, padding: '6px 14px', cursor: 'pointer', fontWeight: 600 }}>+ 緊急性を追加</button>
            </SectionCard>

            <SectionCard title="CTA（行動喚起）" icon="🔥" color="#B91C1C">
              <Input label="CTAボタンのテキスト" value={data.ctaText} onChange={v => update({ ctaText: v })} placeholder="例: 今すぐ申し込む" />
            </SectionCard>

            <SectionCard title="メモ" icon="📝" color="#6B7280">
              <Input label="オファー設計のメモ・考慮事項" value={data.notes} onChange={v => update({ notes: v })} placeholder="A/Bテストの結果やアイデアなどをメモ" multiline />
            </SectionCard>
          </div>
        )}
      </main>
    </div>
  );
}
