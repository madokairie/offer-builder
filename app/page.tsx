'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';

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

interface Objection {
  id: string;
  objection: string;   // 「高い」「時間がない」など
  response: string;    // それに対する回答
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
  objections: Objection[];
  ctaText: string;
  notes: string;
  valueEquation: ValueEquation;
}

// ─── 初期値 ─────────────────────────────────────

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from < 0 || from >= arr.length || to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

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
  objections: [],
  ctaText: '今すぐ申し込む',
  notes: '',
  valueEquation: { dreamOutcome: 3, likelihood: 3, timeToResult: 3, effortRequired: 3 },
};

// ─── 反論テンプレート ─────────────────────────────

const OBJECTION_TEMPLATES: { objection: string; hint: string; responseTemplate: string; offerFix: string }[] = [
  { objection: '高い・お金がない', hint: '分割払い、投資対効果、「やらないコスト」の提示',
    responseTemplate: '確かに安い金額ではありません。ただ、{outcome}を考えると、この投資は{period}で回収できます。{payment}もご用意しています。逆に、今やらないことで失い続けるコスト（時間・機会損失）の方が大きいのではないでしょうか。',
    offerFix: '分割払いオプションの追加、ROI（投資対効果）の数値化、「やらないコスト」の可視化' },
  { objection: '時間がない', hint: '1日○分、スキマ時間OK、録画視聴可能',
    responseTemplate: 'お忙しい方のために設計されたプログラムです。1日たった{minutes}分、スキマ時間で進められます。動画は録画配信なのでいつでも視聴可能。忙しいからこそ、効率的な方法を手に入れる価値があります。',
    offerFix: '「1日○分でOK」の時間保証を追加、録画視聴・アーカイブ特典、時短テンプレートの特典追加' },
  { objection: '自分にできるか不安', hint: 'サポート体制、初心者向け、成功事例の提示',
    responseTemplate: 'ご安心ください。{support}のサポート体制があります。初心者の方でもステップバイステップで進められるよう設計されています。実際に同じ不安を抱えていた方が{result}を達成されています。',
    offerFix: '個別サポート・チャットサポートの追加、初心者向けスタートガイド特典、「同じ不安を持っていた受講生の声」を特典に追加' },
  { objection: '今じゃなくていい', hint: '先送りのリスク、限定性、タイミングの重要性',
    responseTemplate: '確かにいつでも始められると思いがちですが、{urgency}。先延ばしにした分だけ{pain}の状態が続きます。「あの時始めておけば…」と後悔する方を何人も見てきました。',
    offerFix: '期限付き特典・早期割引の追加、「先延ばしのコスト」セクション、値上げ予告の設定' },
  { objection: '他と何が違うの？', hint: '独自メソッド、実績、サポートの手厚さ',
    responseTemplate: '一般的な{category}との違いは3つあります。①独自の{method}メソッド ②{support}の手厚いサポート ③{track}の実績。表面的なノウハウではなく、再現性のある仕組みをお渡しします。',
    offerFix: '独自メソッド名・フレームワーク名の命名、比較表の作成、サポート内容の差別化ポイント明確化' },
  { objection: '本当に結果が出る？', hint: '具体的な数字、受講生の声、再現性の根拠',
    responseTemplate: 'これまで{count}名以上の方が実践し、{successRate}の方が{result}を達成されています。もちろん個人差はありますが、カリキュラム通りに進めていただければ{guarantee}。',
    offerFix: '成功事例集の特典追加、具体的な数値実績の記載、成果保証・返金保証の検討' },
];

// ─── 反論処理アドバイザー ──────────────────────────

interface ObjectionAdvice {
  objection: string;
  hasResponse: boolean;
  suggestedResponse: string;
  offerGaps: { gap: string; fix: string; fixType: 'bonus' | 'urgency' | 'pricing' | 'content' }[];
  faqReady: boolean;
}

function analyzeObjectionGaps(d: OfferData): ObjectionAdvice[] {
  const advices: ObjectionAdvice[] = [];
  const mainPrice = d.priceTiers.find(t => t.isRecommended)?.price || d.priceTiers[0]?.price || '';
  const hasPayment = d.paymentPlans.filter(Boolean).length >= 2;
  const hasDeadline = d.urgencyElements.some(u => u.type === 'deadline');
  const hasLimit = d.urgencyElements.some(u => u.type === 'limited-spots');
  const hasSupportBonus = d.bonuses.some(b => /サポート|コンサル|質問|チャット|フォロー/.test(b.name + b.description));
  const hasCaseStudy = d.bonuses.some(b => /事例|成功|受講生|声|実績/.test(b.name + b.description));
  const hasGuarantee = /保証|返金|全額/.test(d.bonuses.map(b => b.name + b.description).join('') + d.notes);

  // 各テンプレート反論について分析
  for (const tmpl of OBJECTION_TEMPLATES) {
    const existing = d.objections.find(o => o.objection === tmpl.objection);
    const hasResponse = !!(existing && existing.response.trim());
    const gaps: ObjectionAdvice['offerGaps'] = [];

    // 反論ごとのオファーギャップ分析
    if (tmpl.objection === '高い・お金がない') {
      if (!hasPayment) gaps.push({ gap: '分割払いオプションがない', fix: '3回・6回分割を追加して月額負担を軽減', fixType: 'pricing' });
      if (!d.anchorPrice) gaps.push({ gap: 'アンカー価格が未設定', fix: '「通常○○万円のところ」と比較基準を提示して割安感を出す', fixType: 'pricing' });
      if (d.bonuses.length < 2) gaps.push({ gap: '特典が少なく「お得感」が弱い', fix: '特典を追加して「本体+特典で○○万円相当」の価値スタッキング', fixType: 'bonus' });
    } else if (tmpl.objection === '時間がない') {
      if (!d.bonuses.some(b => /テンプレ|時短|チェックリスト|すぐ使える/.test(b.name + b.description)))
        gaps.push({ gap: '時短ツールの特典がない', fix: '「すぐ使えるテンプレート集」「時短チェックリスト」を特典に追加', fixType: 'bonus' });
      if (!/録画|アーカイブ|いつでも/.test(d.priceTiers.flatMap(t => t.includes).join('')))
        gaps.push({ gap: '録画・アーカイブの記載がない', fix: 'プランの含まれるものに「録画アーカイブ（期間中いつでも視聴可）」を追加', fixType: 'content' });
    } else if (tmpl.objection === '自分にできるか不安') {
      if (!hasSupportBonus) gaps.push({ gap: 'サポート特典がない', fix: '「個別チャットサポート」「Q&Aセッション」などのサポート特典を追加', fixType: 'bonus' });
      if (!hasCaseStudy) gaps.push({ gap: '成功事例がない', fix: '「受講生の成功事例集」を特典に追加。同じ境遇の人の事例は最強の安心材料', fixType: 'bonus' });
      if (!hasGuarantee) gaps.push({ gap: '保証がない', fix: '成果保証（「○日実践して成果が出なければ全額返金」）の検討をメモ欄に記載', fixType: 'content' });
    } else if (tmpl.objection === '今じゃなくていい') {
      if (!hasDeadline) gaps.push({ gap: '期限が設定されていない', fix: '「○月○日まで」の期限付き特典・価格を設定', fixType: 'urgency' });
      if (!hasLimit) gaps.push({ gap: '人数制限がない', fix: '「月○名限定」で枠の希少性を追加', fixType: 'urgency' });
      if (!d.urgencyElements.some(u => u.type === 'price-increase'))
        gaps.push({ gap: '値上げ予告がない', fix: '「次期は○○円に値上げ予定」で今申し込む理由を作る', fixType: 'urgency' });
    } else if (tmpl.objection === '他と何が違うの？') {
      if (!/独自|オリジナル|メソッド|フレームワーク|○○式/.test(d.notes + d.tagline + d.desiredOutcome))
        gaps.push({ gap: '独自メソッド名がない', fix: 'メモ欄に独自メソッド名やフレームワーク名を記載。名前があると差別化になる', fixType: 'content' });
      if (d.priceTiers.length < 2)
        gaps.push({ gap: 'プランが1つで比較しにくい', fix: '松竹梅プランを用意し、サポートの手厚さで差別化', fixType: 'pricing' });
    } else if (tmpl.objection === '本当に結果が出る？') {
      if (!hasCaseStudy) gaps.push({ gap: '実績・事例の特典がない', fix: '「成功事例集」「Before/After集」を特典に追加', fixType: 'bonus' });
      if (!/\d+[人名%件]/.test(d.desiredOutcome + d.notes))
        gaps.push({ gap: '具体的な数値実績がない', fix: '得られる結果に「○名が○○を達成」のような数値を入れる', fixType: 'content' });
      if (!hasGuarantee) gaps.push({ gap: '保証の記載がない', fix: '全額返金保証や成果保証を検討しメモ欄に方針を記載', fixType: 'content' });
    }

    // 回答テンプレートをオファーデータで動的に埋める
    let suggested = tmpl.responseTemplate;
    suggested = suggested.replace('{outcome}', d.desiredOutcome.split('\n')[0] || '得られる成果');
    suggested = suggested.replace('{period}', '3ヶ月');
    suggested = suggested.replace('{payment}', hasPayment ? `${d.paymentPlans.filter(Boolean).join('・')}` : '分割払い');
    suggested = suggested.replace('{minutes}', '15〜30');
    suggested = suggested.replace('{support}', hasSupportBonus ? d.bonuses.find(b => /サポート|コンサル/.test(b.name))?.name || '充実した' : '充実した');
    suggested = suggested.replace('{result}', d.desiredOutcome.split('\n')[0] || '目標の成果');
    suggested = suggested.replace('{urgency}', hasDeadline ? d.urgencyElements.find(u => u.type === 'deadline')?.description || 'この価格は期間限定です' : 'この特典は期間限定です');
    suggested = suggested.replace('{pain}', d.targetPain.split('\n')[0] || '今の悩み');
    suggested = suggested.replace('{category}', d.productName ? `${d.productName}と似たサービス` : 'サービス');
    suggested = suggested.replace('{method}', '独自の');
    suggested = suggested.replace('{track}', '実績ある');
    suggested = suggested.replace('{count}', '○○');
    suggested = suggested.replace('{successRate}', '○○%');
    suggested = suggested.replace('{guarantee}', hasGuarantee ? '成果保証もお付けしています' : '結果に自信を持ってお届けしています');

    advices.push({
      objection: tmpl.objection,
      hasResponse,
      suggestedResponse: suggested,
      offerGaps: gaps,
      faqReady: hasResponse && gaps.length === 0,
    });
  }

  return advices;
}

// ─── 心理トリガー分析 ─────────────────────────────

interface PsychTrigger {
  name: string;
  icon: string;
  present: boolean;
  score: number;
  maxScore: number;
  advice: string;
}

function analyzePsychTriggers(d: OfferData): PsychTrigger[] {
  const triggers: PsychTrigger[] = [];

  // 社会的証明
  const hasProof = d.bonuses.some(b => /事例|実績|声|受講生|成功/.test(b.name + b.description)) ||
    /実績|受講生|成功|人が/.test(d.desiredOutcome + d.notes);
  triggers.push({
    name: '社会的証明', icon: '👥', present: hasProof, score: hasProof ? 10 : 0, maxScore: 10,
    advice: hasProof
      ? '成功事例・実績の要素があります'
      : '「○○人が成果を出した」「受講生の声」など、他の人も成功している証拠を入れると信頼性が上がります。特典に成功事例集を追加するのも効果的',
  });

  // 権威性
  const hasAuthority = /専門|年|実績|認定|資格|メディア|出版|監修/.test(d.notes + d.desiredOutcome + d.bonuses.map(b => b.name + b.description).join(''));
  triggers.push({
    name: '権威性', icon: '👑', present: hasAuthority, score: hasAuthority ? 10 : 0, maxScore: 10,
    advice: hasAuthority
      ? '専門性・実績の要素が含まれています'
      : '「○年の経験」「○○名を指導」「メディア掲載」など、なぜあなたから買うべきかの根拠を追加しましょう。メモ欄にプロフィール情報を整理してみてください',
  });

  // 希少性
  const hasScarcity = d.urgencyElements.some(u => u.type === 'limited-spots') ||
    d.urgencyElements.some(u => /限定|名|人|枠/.test(u.description));
  triggers.push({
    name: '希少性', icon: '💎', present: hasScarcity, score: hasScarcity ? 10 : 0, maxScore: 10,
    advice: hasScarcity
      ? '人数・数量の限定があり、希少性が効いています'
      : '「月○名限定」「残り○枠」など、数の制限を入れると「今すぐ動かないと手に入らない」感が生まれます',
  });

  // 緊急性（時間制限）
  const hasUrgency = d.urgencyElements.some(u => u.type === 'deadline' || u.type === 'early-bird' || u.type === 'price-increase');
  triggers.push({
    name: '緊急性', icon: '⏰', present: hasUrgency, score: hasUrgency ? 10 : 0, maxScore: 10,
    advice: hasUrgency
      ? '期限・タイムリミットが設定されています'
      : '「○月○日まで」「72時間限定」など、時間の制限を設けると後回しを防げます',
  });

  // 返報性
  const hasReciprocity = d.bonuses.length >= 2 ||
    d.bonuses.some(b => /無料|プレゼント|ギフト|特別/.test(b.name + b.description));
  triggers.push({
    name: '返報性', icon: '🎁', present: hasReciprocity, score: hasReciprocity ? 8 : 0, maxScore: 8,
    advice: hasReciprocity
      ? '特典で「もらいすぎ」感を作れています'
      : '無料の価値ある特典を先に渡すと「こんなにもらったのだから」という返報性が働きます。特典を追加しましょう',
  });

  // 損失回避
  const hasLossAversion = /失う|手遅れ|逃す|損|今しか|なくな/.test(
    d.urgencyElements.map(u => u.description).join('') + d.tagline + d.targetPain
  ) || d.urgencyElements.some(u => u.type === 'price-increase');
  triggers.push({
    name: '損失回避', icon: '⚠️', present: hasLossAversion, score: hasLossAversion ? 8 : 0, maxScore: 8,
    advice: hasLossAversion
      ? '「失う恐怖」を訴求できています'
      : '人は「得る喜び」より「失う恐怖」に2倍反応します。「この機会を逃すと…」「値上げ予告」などで損失回避を刺激しましょう',
  });

  // 反論処理
  const hasObjections = d.objections.filter(o => o.objection && o.response).length >= 3;
  triggers.push({
    name: '反論処理', icon: '🛡️', present: hasObjections, score: hasObjections ? 8 : d.objections.filter(o => o.response).length >= 1 ? 4 : 0, maxScore: 8,
    advice: hasObjections
      ? '主要な反論に対する回答が用意されています'
      : '「高い」「時間がない」「自分にできるか不安」の3大反論には最低限回答を用意しましょう。反論処理シートを活用してください',
  });

  return triggers;
}

// ─── HTMLエスケープ ──────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── CTA改善提案 ──────────────────────────────────

function generateCtaSuggestions(d: OfferData): { text: string; reason: string }[] {
  const suggestions: { text: string; reason: string }[] = [];
  const name = d.productName || 'プログラム';
  const hasDeadline = d.urgencyElements.some(u => u.type === 'deadline');
  const hasLimit = d.urgencyElements.some(u => u.type === 'limited-spots');
  const outcome = d.desiredOutcome.split('\n')[0]?.trim() || '';

  // 基本系（CTAは12文字以内が理想）
  const shortName = name.length > 8 ? name.slice(0, 8) : name;
  suggestions.push({ text: `${shortName}に参加する`, reason: '「申し込む」より「参加する」の方が心理的ハードルが低い' });

  // 成果訴求系（CTAは12文字以内が理想）
  if (outcome) {
    const short = outcome.length > 8 ? outcome.slice(0, 8) : outcome;
    suggestions.push({ text: `${short}を手に入れる`, reason: 'ボタン自体がベネフィットを伝える' });
  }

  // 緊急性系
  if (hasDeadline) {
    suggestions.push({ text: '今すぐ席を確保する', reason: '「確保」で希少性を強調' });
  }
  if (hasLimit) {
    suggestions.push({ text: '残りの枠を確認する', reason: '直接購入ではなく「確認」で心理的ハードルを下げる' });
  }

  // ハードル低め系
  suggestions.push({ text: 'まずは詳細を見る', reason: '購入コミットではなく情報取得なのでクリック率が上がる' });
  suggestions.push({ text: '無料で相談してみる', reason: '「無料」+「してみる」でダブルのハードル低減' });

  // 変化訴求系
  suggestions.push({ text: '新しい一歩を踏み出す', reason: '変化への期待を刺激する感情訴求' });

  return suggestions;
}

// ─── コンセプト設計アプリ連携（貼り付け解析） ────

function parseConceptSheet(raw: string): Partial<OfferData> {
  // HTMLタグを除去してテキスト化しつつ、セクション構造を保持
  const text = raw
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(?:p|div|li|dd|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n');

  const result: Partial<OfferData> = {};

  // 商品名: 「商品」「サービス」「プログラム」キーワードの後の値
  const productMatch = text.match(/(?:商品[名概要]*|サービス[名]?|プログラム[名]?)[：:\s]*([^\n]+)/);
  if (productMatch) result.productName = productMatch[1].trim();

  // フォールバック: プロダクト/講座名/コース名
  if (!result.productName) {
    const productAltMatch = text.match(/(?:プロダクト|提供する.*?|講座名|コース名)[：:\s]*([^\n]+)/);
    if (productAltMatch) result.productName = productAltMatch[1].trim();
  }

  // メインコピー
  const mainCopyMatch = text.match(/(?:メインコピー)[：:\s]*\n?([^\n]+)/);
  if (mainCopyMatch) result.tagline = mainCopyMatch[1].trim();

  // サブコピー（メインコピーが無い場合のフォールバック）
  if (!result.tagline) {
    const subCopyMatch = text.match(/(?:サブコピー)[：:\s]*\n?([^\n]+)/);
    if (subCopyMatch) result.tagline = subCopyMatch[1].trim();
  }

  // フォールバック: キャッチコピー/ヘッドライン/見出し
  if (!result.tagline) {
    const catchCopyMatch = text.match(/(?:キャッチコピー|ヘッドライン|見出し)[：:\s]*\n?([^\n]+)/);
    if (catchCopyMatch) result.tagline = catchCopyMatch[1].trim();
  }

  // ターゲットの悩み: 「深い悩み」セクション
  const painMatch = text.match(/(?:深い悩み|ターゲット.*悩み)[^\n]*\n([\s\S]*?)(?=\n(?:Phase|感情|入り口|買わない|理想|ペルソナ|パーソナル|\d+\.|$))/i);
  if (painMatch) {
    const lines = painMatch[1].split('\n').map(l => l.replace(/^[\s・\-\d.]+/, '').trim()).filter(Boolean);
    result.targetPain = lines.slice(0, 5).join('\n');
  }

  // フォールバック: ターゲット/ペルソナ/理想の顧客からtargetPainを補完
  if (!result.targetPain) {
    const targetMatch = text.match(/(?:ターゲット|ペルソナ|理想の顧客)[：:\s]*\n?([^\n]+)/);
    if (targetMatch) result.targetPain = targetMatch[1].trim();
  }

  // 得られる結果: 「理想の未来」セクション
  const futureMatch = text.match(/(?:理想の未来|理想像|ゴール|得られる[結成]果)[^\n]*\n([\s\S]*?)(?=\n(?:Phase|買わない|感情|入り口|深い悩み|\d+\.|$))/i);
  if (futureMatch) {
    const lines = futureMatch[1].split('\n').map(l => l.replace(/^[\s・\-\d.]+/, '').trim()).filter(Boolean);
    result.desiredOutcome = lines.slice(0, 5).join('\n');
  }

  // data-field属性からの構造化データ抽出（フォールバック）
  const dataFieldMatches = raw.matchAll(/data-field="([^"]+)"[^>]*>([^<]+)</g);
  for (const m of dataFieldMatches) {
    const field = m[1].toLowerCase();
    const value = m[2].trim();
    if (!value) continue;
    if (!result.productName && (field === 'productname' || field === 'product_name' || field === 'product')) {
      result.productName = value;
    }
    if (!result.tagline && (field === 'tagline' || field === 'maincopy' || field === 'main_copy' || field === 'catchcopy')) {
      result.tagline = value;
    }
    if (!result.targetPain && (field === 'targetpain' || field === 'target_pain' || field === 'pain')) {
      result.targetPain = value;
    }
    if (!result.desiredOutcome && (field === 'desiredoutcome' || field === 'desired_outcome' || field === 'outcome' || field === 'future')) {
      result.desiredOutcome = value;
    }
  }

  return result;
}

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
      ...EMPTY_OFFER, objections: [],
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
  const psychTriggers = useMemo(() => analyzePsychTriggers(data), [data]);

  const totalScore = items.reduce((s, i) => s + i.score, 0) + psychTriggers.reduce((s, t) => s + t.score, 0);
  const maxScore = items.reduce((s, i) => s + i.maxScore, 0) + psychTriggers.reduce((s, t) => s + t.maxScore, 0);
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

          <div data-ve-grid="" style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px',
            padding: '16px 0', borderTop: '1px solid #F1F5F9',
          }}>
            <VESlider label="理想の結果の大きさ" desc="人生が変わるレベルか" value={ve.dreamOutcome} color="#6366F1"              tips={['ニッチすぎる', '小さい改善', '実用的な成果', '大きな変化', '人生が変わる']}
              />
            <VESlider label="達成できる可能性" desc="本当に実現できそうか" value={ve.likelihood} color="#059669"              tips={['証拠なし', '理論のみ', '一部成功例', '多数の実績', '再現性が高い']}
              />
            <VESlider label="結果が出る速さ" desc="どのくらい早く結果が出るか" value={ve.timeToResult} color="#D97706"              tips={['1年以上', '半年', '3ヶ月', '1ヶ月', '即日〜1週間']}
              />
            <VESlider label="労力の少なさ" desc="どのくらい楽にできるか" value={ve.effortRequired} color="#DC2626"              tips={['フルコミット', 'かなり大変', 'それなりに', '手軽', 'ほぼ不要']}
              />
          </div>
        </div>
      </div>

      {/* 心理トリガーチェック */}
      <div style={{
        background: '#FFF', borderRadius: 16, overflow: 'hidden',
        border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>心理トリガーチェック</h3>
          <div style={{ fontSize: 14, color: '#94A3B8', marginTop: 4 }}>
            {psychTriggers.filter(t => t.present).length}/{psychTriggers.length}個の心理要素が有効
          </div>
        </div>
        <div style={{ padding: '16px 24px' }}>
          <div data-psych-grid="" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {psychTriggers.map((trigger, i) => (
              <div key={i} style={{
                padding: '16px', borderRadius: 12,
                border: trigger.present ? '1px solid #BBF7D0' : '1px solid #FED7AA',
                background: trigger.present ? '#F0FDF4' : '#FFF7ED',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 20 }}>{trigger.icon}</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: trigger.present ? '#166534' : '#9A3412' }}>{trigger.name}</span>
                  <span style={{
                    marginLeft: 'auto', fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 6,
                    background: trigger.present ? '#DCFCE7' : '#FFEDD5',
                    color: trigger.present ? '#16A34A' : '#EA580C',
                  }}>{trigger.present ? 'ON' : 'OFF'}</span>
                </div>
                <div style={{ fontSize: 13, color: '#64748B', lineHeight: 1.5 }}>{trigger.advice}</div>
              </div>
            ))}
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

function VESlider({ label, desc, value, color, tips }: {
  label: string; desc: string; value: number; color: string;
  tips: string[];
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

function formatRelativeTime(date: Date): string {
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diffSec < 5) return 'たった今';
  if (diffSec < 30) return '数秒前';
  if (diffSec < 60) return '30秒前';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 2) return '1分前';
  if (diffMin < 60) return `${diffMin}分前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 2) return '1時間前';
  return `${diffHour}時間前`;
}

export default function OfferBuilder() {
  const [offers, setOffers] = useState<SavedOffer[]>([]);
  const [activeOfferId, setActiveOfferId] = useState<string>('');
  const [data, setData] = useState<OfferData>(EMPTY_OFFER);
  const [tab, setTab] = useState<TabId>('edit');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [, setTick] = useState(0);
  const [showOfferList, setShowOfferList] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [copied, setCopied] = useState(false);
  const [basicInfoMode, setBasicInfoMode] = useState<'manual' | 'concept'>('manual');
  const [conceptPasteText, setConceptPasteText] = useState('');
  const [conceptParsed, setConceptParsed] = useState<Partial<OfferData> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Tick every 10s to update relative time display
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 10000);
    return () => clearInterval(timer);
  }, []);

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
      data: { ...EMPTY_OFFER, ...o.data, valueEquation: o.data.valueEquation || EMPTY_OFFER.valueEquation, objections: o.data.objections || [] },
    }));
    setOffers(saved);
    saveOffers(saved);
    const activeId = localStorage.getItem(ACTIVE_KEY) || saved[0].id;
    const active = saved.find(o => o.id === activeId) || saved[0];
    setActiveOfferId(active.id);
    setData(active.data);
    setLastSaved(new Date());
  }, []);

  function update(partial: Partial<OfferData>) {
    const next = { ...data, ...partial };
    setData(next);
    const updated = offers.map(o =>
      o.id === activeOfferId ? { ...o, data: next, updatedAt: new Date().toISOString(), name: next.productName || o.name } : o
    );
    setOffers(updated);
    saveOffers(updated);
    setLastSaved(new Date());
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

  function duplicateOffer(id: string) {
    const src = offers.find(o => o.id === id);
    if (!src) return;
    const dup: SavedOffer = {
      id: genId(),
      name: (src.data.productName || src.name) + '（コピー）',
      data: { ...JSON.parse(JSON.stringify(src.data)), productName: (src.data.productName || src.name) + '（コピー）' },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [...offers, dup];
    setOffers(next);
    saveOffers(next);
    switchOffer(dup.id);
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
    if (data.objections.filter(o => o.objection && o.response).length) {
      lines.push('\n━━ FAQ ━━');
      data.objections.filter(o => o.objection && o.response).forEach(o => {
        lines.push(`Q: ${o.objection}`);
        lines.push(`A: ${o.response}`);
      });
    }
    lines.push(`\nCTA: ${data.ctaText}`);
    navigator.clipboard.writeText(lines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function downloadText() {
    const lines: string[] = [];
    lines.push(`═══════════════════════════════════════`);
    lines.push(`  ${data.productName || 'オファー設計書'}`);
    lines.push(`═══════════════════════════════════════`);
    lines.push('');
    if (data.tagline) lines.push(`▼ キャッチコピー\n${data.tagline}\n`);
    if (data.targetPain) lines.push(`▼ ターゲットの悩み\n${data.targetPain}\n`);
    if (data.desiredOutcome) lines.push(`▼ 得られる結果\n${data.desiredOutcome}\n`);

    lines.push(`▼ 価値方程式`);
    lines.push(`  理想の結果: ${data.valueEquation.dreamOutcome}/5  実現可能性: ${data.valueEquation.likelihood}/5`);
    lines.push(`  結果の速さ: ${data.valueEquation.timeToResult}/5  労力の少なさ: ${data.valueEquation.effortRequired}/5\n`);

    lines.push(`▼ プラン & 価格`);
    if (data.anchorPrice) lines.push(`  通常価格: ${data.anchorPrice}円`);
    data.priceTiers.forEach(t => {
      lines.push(`  ${t.isRecommended ? '★ ' : '  '}${t.name}: ¥${t.price}`);
      if (t.description) lines.push(`    ${t.description}`);
      t.includes.filter(Boolean).forEach(inc => lines.push(`    ✓ ${inc}`));
    });
    if (data.paymentPlans.filter(Boolean).length) lines.push(`  支払方法: ${data.paymentPlans.filter(Boolean).join(' / ')}`);
    lines.push('');

    if (data.bonuses.length) {
      lines.push(`▼ 特典`);
      data.bonuses.forEach((b, i) => {
        lines.push(`  ${i + 1}. ${b.name}${b.value ? `（${b.value}）` : ''}`);
        if (b.description) lines.push(`     ${b.description}`);
      });
      const totalBonus = data.bonuses.reduce((s, b) => s + parseNum(b.value), 0);
      if (totalBonus > 0) lines.push(`  → 特典総額: ${totalBonus.toLocaleString()}円相当`);
      lines.push('');
    }

    if (data.urgencyElements.length) {
      lines.push(`▼ 緊急性・限定条件`);
      data.urgencyElements.forEach(u => lines.push(`  ${URGENCY_ICONS[u.type] || '⚡'} ${URGENCY_LABELS[u.type]}: ${u.description}`));
      lines.push('');
    }

    if (data.objections.filter(o => o.objection && o.response).length) {
      lines.push(`▼ よくあるご質問（FAQ）`);
      data.objections.filter(o => o.objection && o.response).forEach(o => {
        lines.push(`  Q: ${o.objection}`);
        lines.push(`  A: ${o.response}`);
        lines.push('');
      });
    }

    if (data.objections.filter(o => o.objection && !o.response).length) {
      lines.push(`▼ 反論処理（未回答）`);
      data.objections.filter(o => o.objection && !o.response).forEach(o => {
        lines.push(`  Q: ${o.objection}`);
        lines.push(`  A: （要回答）`);
        lines.push('');
      });
    }

    lines.push(`▼ CTA: ${data.ctaText}`);
    if (data.notes) lines.push(`\n▼ メモ\n${data.notes}`);

    const blob = new Blob([lines.join('\n')], { type: 'text/plain; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${data.productName || 'offer'}_設計書.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function generatePDFHtml(forPrint: boolean) {
    const totalBonus = data.bonuses.reduce((s, b) => s + parseNum(b.value), 0);
    const ve = data.valueEquation;
    const veScore = (ve.dreamOutcome * ve.likelihood) / (Math.max(6 - ve.timeToResult, 1) * Math.max(6 - ve.effortRequired, 1));

    // 診断データ
    const diag = diagnoseOffer(data);
    const psych = analyzePsychTriggers(data);
    const dTotal = diag.reduce((s, i) => s + i.score, 0) + psych.reduce((s, t) => s + t.score, 0);
    const dMax = diag.reduce((s, i) => s + i.maxScore, 0) + psych.reduce((s, t) => s + t.maxScore, 0);
    const dPct = dMax > 0 ? Math.round((dTotal / dMax) * 100) : 0;
    const dGrade = dPct >= 85 ? 'S' : dPct >= 70 ? 'A' : dPct >= 55 ? 'B' : dPct >= 40 ? 'C' : 'D';
    const dColor = dPct >= 85 ? '#059669' : dPct >= 70 ? '#2563EB' : dPct >= 55 ? '#D97706' : dPct >= 40 ? '#EA580C' : '#DC2626';
    const dLabel = dPct >= 85 ? '売れるオファー' : dPct >= 70 ? 'あと少しで完成' : dPct >= 55 ? '改善の余地あり' : dPct >= 40 ? '要改善' : '設計不足';
    const dCategories = [...new Set(diag.map(i => i.category))];

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${data.productName || 'オファー設計書'}</title>
<style>
  @page { size: A4; margin: 20mm 18mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif; color: #1a1a1a; line-height: 1.7; font-size: 12px; }
  .page { max-width: 700px; margin: 0 auto; }
  .header { text-align: center; padding-bottom: 20px; border-bottom: 3px solid #0f172a; margin-bottom: 24px; }
  .header h1 { font-size: 22px; font-weight: 800; color: #0f172a; margin-bottom: 4px; }
  .header .tagline { font-size: 14px; color: #475569; font-weight: 500; }
  .header .date { font-size: 10px; color: #94a3b8; margin-top: 6px; }
  .section { margin-bottom: 20px; break-inside: avoid; }
  .section-title { font-size: 13px; font-weight: 700; color: #0f172a; padding: 6px 12px; background: #f1f5f9; border-left: 4px solid #6366f1; margin-bottom: 10px; }
  .section-body { padding: 0 12px; }
  .kv { display: flex; gap: 8px; margin-bottom: 5px; }
  .kv .k { font-weight: 600; color: #475569; min-width: 120px; flex-shrink: 0; font-size: 12px; }
  .kv .v { color: #1e293b; }
  .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px; margin-bottom: 8px; background: #fafbfc; }
  .card.recommended { border: 2px solid #6366f1; background: #fff; }
  .card-title { font-size: 14px; font-weight: 700; color: #0f172a; }
  .card-price { font-size: 20px; font-weight: 800; color: #0f172a; margin: 3px 0; }
  .card-desc { font-size: 11px; color: #64748b; margin-bottom: 6px; }
  .check-item { display: flex; gap: 5px; font-size: 11px; margin-bottom: 2px; }
  .check-item .icon { color: #10b981; flex-shrink: 0; }
  .bonus-card { border: 1px solid #fde68a; border-radius: 10px; padding: 12px; margin-bottom: 6px; background: #fffbeb; display: flex; gap: 10px; align-items: flex-start; }
  .bonus-num { width: 24px; height: 24px; border-radius: 6px; background: #f59e0b; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 12px; flex-shrink: 0; }
  .bonus-name { font-weight: 700; color: #78350f; font-size: 13px; }
  .bonus-desc { font-size: 11px; color: #92400e; }
  .bonus-val { font-size: 11px; font-weight: 700; color: #b45309; background: #fde68a; padding: 2px 8px; border-radius: 4px; flex-shrink: 0; }
  .urgency-row { display: flex; gap: 6px; flex-wrap: wrap; }
  .urgency-tag { padding: 5px 12px; background: #fff1f2; border: 1px solid #fecdd3; border-radius: 8px; font-size: 12px; font-weight: 600; color: #9f1239; }
  .objection { margin-bottom: 10px; }
  .objection .q { font-weight: 700; color: #dc2626; font-size: 12px; margin-bottom: 2px; }
  .objection .a { color: #1e293b; font-size: 12px; padding-left: 10px; border-left: 3px solid #bbf7d0; }
  .ve-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .ve-item { padding: 8px 12px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
  .ve-label { font-size: 10px; color: #64748b; font-weight: 600; }
  .ve-bar { display: flex; gap: 2px; margin-top: 3px; }
  .ve-dot { width: 100%; height: 5px; border-radius: 3px; }
  .ve-score-box { text-align: center; padding: 12px; border-radius: 10px; background: ${veScore >= 4 ? '#f0fdf4' : veScore >= 2 ? '#fffbeb' : '#fef2f2'}; margin-bottom: 8px; }
  .cta-box { text-align: center; margin-top: 20px; padding: 16px; }
  .cta-btn { display: inline-block; padding: 12px 44px; background: #0f172a; color: #fff; font-size: 15px; font-weight: 800; border-radius: 12px; }
  .plans-grid { display: grid; grid-template-columns: ${data.priceTiers.length === 1 ? '1fr' : data.priceTiers.length === 2 ? '1fr 1fr' : '1fr 1fr 1fr'}; gap: 8px; }
  .total-bonus { text-align: center; font-size: 14px; font-weight: 800; color: #92400e; margin-top: 8px; }
  .anchor { text-align: center; font-size: 13px; color: #94a3b8; margin-bottom: 10px; }
  .anchor .strike { text-decoration: line-through; color: #ef4444; font-weight: 600; }
  .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 9px; color: #94a3b8; }
  /* 診断スタイル */
  .eval-header { display: flex; align-items: center; gap: 16px; padding: 16px; background: #f8fafc; border-radius: 12px; border: 2px solid ${dColor}; margin-bottom: 14px; }
  .eval-grade { width: 64px; height: 64px; border-radius: 50%; border: 3px solid ${dColor}; display: flex; align-items: center; justify-content: center; flex-direction: column; flex-shrink: 0; }
  .eval-grade-letter { font-size: 26px; font-weight: 800; color: ${dColor}; line-height: 1; }
  .eval-grade-pct { font-size: 11px; color: #64748b; }
  .eval-label { font-size: 16px; font-weight: 700; color: #0f172a; }
  .eval-sub { font-size: 12px; color: #64748b; margin-top: 2px; }
  .eval-bar { height: 6px; background: #f1f5f9; border-radius: 4px; overflow: hidden; margin-top: 8px; }
  .eval-bar-fill { height: 100%; border-radius: 4px; background: ${dColor}; }
  .psych-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
  .psych-item { padding: 8px 12px; border-radius: 8px; font-size: 12px; display: flex; align-items: center; gap: 6px; }
  .psych-on { background: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; }
  .psych-off { background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; }
  .psych-badge { font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; margin-left: auto; }
  .diag-row { display: flex; gap: 8px; align-items: flex-start; padding: 6px 0; border-bottom: 1px solid #f8fafc; }
  .diag-icon { width: 18px; height: 18px; border-radius: 5px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; flex-shrink: 0; margin-top: 1px; }
  .diag-good { background: #d1fae5; color: #059669; }
  .diag-warn { background: #fef9c3; color: #ca8a04; }
  .diag-miss { background: #fee2e2; color: #dc2626; }
  .diag-label { font-size: 12px; font-weight: 500; color: #0f172a; }
  .diag-advice { font-size: 10px; color: #94a3b8; line-height: 1.4; }
  .diag-score { font-size: 11px; color: #94a3b8; flex-shrink: 0; }
  .diag-cat { font-size: 11px; font-weight: 600; color: #94a3b8; margin: 10px 0 4px; letter-spacing: 0.05em; }
  .page-break { break-before: page; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1>${esc(data.productName || 'オファー設計書')}</h1>
    ${data.tagline ? `<div class="tagline">${esc(data.tagline)}</div>` : ''}
    <div class="date">${new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })} 作成</div>
  </div>

  <!-- 診断スコアサマリー -->
  <div class="section">
    <div class="section-title">オファー診断</div>
    <div class="section-body">
      <div class="eval-header">
        <div class="eval-grade">
          <div class="eval-grade-letter">${dGrade}</div>
          <div class="eval-grade-pct">${dPct}点</div>
        </div>
        <div>
          <div class="eval-label">${dLabel}</div>
          <div class="eval-sub">${diag.filter(i => i.status === 'good').length + psych.filter(t => t.present).length}/${diag.length + psych.length}項目クリア</div>
          <div class="eval-bar" style="width:200px;">
            <div class="eval-bar-fill" style="width:${dPct}%;"></div>
          </div>
        </div>
      </div>

      <!-- 心理トリガー -->
      <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:6px;">心理トリガーチェック（${psych.filter(t => t.present).length}/${psych.length}個 有効）</div>
      <div class="psych-grid">
        ${psych.map(t => `
          <div class="psych-item ${t.present ? 'psych-on' : 'psych-off'}">
            <span>${t.icon}</span>
            <span style="font-weight:600;">${t.name}</span>
            <span class="psych-badge" style="background:${t.present ? '#dcfce7' : '#ffedd5'};color:${t.present ? '#16a34a' : '#ea580c'};">${t.present ? 'ON' : 'OFF'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  ${data.targetPain || data.desiredOutcome ? `
  <div class="section">
    <div class="section-title">ターゲット & ベネフィット</div>
    <div class="section-body">
      ${data.targetPain ? `<div class="kv"><div class="k">ターゲットの悩み</div><div class="v">${esc(data.targetPain).replace(/\n/g, '<br>')}</div></div>` : ''}
      ${data.desiredOutcome ? `<div class="kv"><div class="k">得られる結果</div><div class="v">${esc(data.desiredOutcome).replace(/\n/g, '<br>')}</div></div>` : ''}
    </div>
  </div>` : ''}

  <div class="section">
    <div class="section-title">価値方程式</div>
    <div class="section-body">
      <div class="ve-score-box">
        <div style="font-size:10px;color:#64748b;">価値スコア</div>
        <div style="font-size:24px;font-weight:800;color:${veScore >= 4 ? '#059669' : veScore >= 2 ? '#d97706' : '#dc2626'};">${veScore.toFixed(1)}</div>
      </div>
      <div class="ve-grid">
        ${[
          { label: '理想の結果', val: ve.dreamOutcome, color: '#6366f1' },
          { label: '実現可能性', val: ve.likelihood, color: '#059669' },
          { label: '結果の速さ', val: ve.timeToResult, color: '#d97706' },
          { label: '労力の少なさ', val: ve.effortRequired, color: '#dc2626' },
        ].map(v => `
          <div class="ve-item">
            <div class="ve-label">${v.label}: ${v.val}/5</div>
            <div class="ve-bar">${[1,2,3,4,5].map(i => `<div class="ve-dot" style="background:${i <= v.val ? v.color : '#e2e8f0'}"></div>`).join('')}</div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">プラン & 価格</div>
    <div class="section-body">
      ${data.anchorPrice ? `<div class="anchor">通常価格 <span class="strike">${esc(data.anchorPrice)}円</span></div>` : ''}
      <div class="plans-grid">
        ${data.priceTiers.map(t => `
          <div class="card${t.isRecommended ? ' recommended' : ''}">
            ${t.isRecommended ? '<div style="font-size:9px;font-weight:700;color:#6366f1;letter-spacing:0.1em;margin-bottom:3px;">★ RECOMMENDED</div>' : ''}
            <div class="card-title">${esc(t.name)}</div>
            <div class="card-price">¥${esc(t.price) || '—'}</div>
            <div class="card-desc">${esc(t.description)}</div>
            ${t.includes.filter(Boolean).map(inc => `<div class="check-item"><span class="icon">✓</span><span>${esc(inc)}</span></div>`).join('')}
          </div>
        `).join('')}
      </div>
      ${data.paymentPlans.filter(Boolean).length ? `<div style="text-align:center;font-size:11px;color:#64748b;margin-top:6px;">支払方法: ${data.paymentPlans.filter(Boolean).join(' / ')}</div>` : ''}
    </div>
  </div>

  ${data.bonuses.length ? `
  <div class="section">
    <div class="section-title">特典</div>
    <div class="section-body">
      ${data.bonuses.map((b, i) => `
        <div class="bonus-card">
          <div class="bonus-num">${i + 1}</div>
          <div style="flex:1;">
            <div class="bonus-name">${esc(b.name)}</div>
            <div class="bonus-desc">${esc(b.description)}</div>
          </div>
          ${b.value ? `<div class="bonus-val">${esc(b.value)}</div>` : ''}
        </div>
      `).join('')}
      ${totalBonus > 0 ? `<div class="total-bonus">特典総額 ${totalBonus.toLocaleString()}円相当</div>` : ''}
    </div>
  </div>` : ''}

  ${data.urgencyElements.length ? `
  <div class="section">
    <div class="section-title">緊急性・限定条件</div>
    <div class="section-body">
      <div class="urgency-row">
        ${data.urgencyElements.map(u => `<div class="urgency-tag">${URGENCY_ICONS[u.type] || '⚡'} ${esc(u.description)}</div>`).join('')}
      </div>
    </div>
  </div>` : ''}

  ${data.objections.filter(o => o.objection && o.response).length ? `
  <div class="section">
    <div class="section-title">よくあるご質問（FAQ）</div>
    <div class="section-body">
      ${data.objections.filter(o => o.objection && o.response).map(o => `
        <div class="objection">
          <div class="q">Q. ${esc(o.objection)}</div>
          <div class="a">${esc(o.response).replace(/\n/g, '<br>')}</div>
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  <div class="cta-box">
    <div class="cta-btn">${esc(data.ctaText || '今すぐ申し込む')}</div>
  </div>

  <!-- 診断詳細（2ページ目） -->
  <div class="page-break"></div>
  <div style="text-align:center;margin-bottom:20px;">
    <div style="font-size:18px;font-weight:800;color:#0f172a;">オファー診断レポート</div>
    <div style="font-size:11px;color:#94a3b8;margin-top:4px;">${esc(data.productName || 'オファー')} — ${new Date().toLocaleDateString('ja-JP')}</div>
  </div>

  <!-- 心理トリガー詳細 -->
  <div class="section">
    <div class="section-title">心理トリガー詳細</div>
    <div class="section-body">
      ${psych.map(t => `
        <div style="display:flex;gap:10px;align-items:flex-start;padding:8px 0;border-bottom:1px solid #f1f5f9;">
          <span style="font-size:18px;">${t.icon}</span>
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-size:13px;font-weight:700;color:${t.present ? '#166534' : '#9a3412'};">${t.name}</span>
              <span style="font-size:10px;font-weight:700;padding:1px 6px;border-radius:4px;background:${t.present ? '#dcfce7' : '#ffedd5'};color:${t.present ? '#16a34a' : '#ea580c'};">${t.present ? 'ON' : 'OFF'}</span>
            </div>
            <div style="font-size:11px;color:#64748b;margin-top:2px;line-height:1.5;">${t.advice}</div>
          </div>
          <div style="font-size:11px;color:#94a3b8;flex-shrink:0;">${t.score}/${t.maxScore}</div>
        </div>
      `).join('')}
    </div>
  </div>

  <!-- カテゴリ別チェックリスト -->
  <div class="section">
    <div class="section-title">設計チェックリスト</div>
    <div class="section-body">
      ${dCategories.map(cat => `
        <div class="diag-cat">${cat}</div>
        ${diag.filter(i => i.category === cat).map(item => `
          <div class="diag-row">
            <div class="diag-icon ${item.status === 'good' ? 'diag-good' : item.status === 'warning' ? 'diag-warn' : 'diag-miss'}">
              ${item.status === 'good' ? '✓' : item.status === 'warning' ? '!' : '✕'}
            </div>
            <div style="flex:1;">
              <div class="diag-label">${item.label}</div>
              <div class="diag-advice">${item.advice}</div>
            </div>
            <div class="diag-score">${item.score}/${item.maxScore}</div>
          </div>
        `).join('')}
      `).join('')}
    </div>
  </div>

  ${data.notes ? `
  <div class="section">
    <div class="section-title">メモ</div>
    <div class="section-body"><div style="font-size:11px;color:#64748b;">${esc(data.notes).replace(/\n/g, '<br>')}</div></div>
  </div>` : ''}

  <div class="footer">Offer Builder — オファー設計書 & 診断レポート</div>
</div>
${forPrint ? '<script>window.onload = function() { window.print(); }</script>' : ''}
</body></html>`;

    return html;
  }

  function downloadPDF() {
    const html = generatePDFHtml(true);
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  function exportJSON() {
    const payload = { version: 1, exportedAt: new Date().toISOString(), offers };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json; charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'offer-builder-backup.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string);
        if (!json.offers || !Array.isArray(json.offers)) { alert('無効なバックアップファイルです'); return; }
        const existingIds = new Set(offers.map(o => o.id));
        const imported = (json.offers as SavedOffer[]).filter(o => !existingIds.has(o.id));
        if (imported.length === 0) { alert('新しいオファーはありませんでした'); return; }
        const next = [...offers, ...imported];
        setOffers(next);
        saveOffers(next);
        alert(`${imported.length}件のオファーを復元しました`);
      } catch { alert('ファイルの読み込みに失敗しました'); }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const activeOffer = offers.find(o => o.id === activeOfferId);
  const diagItems = useMemo(() => diagnoseOffer(data), [data]);
  const psychTriggers = useMemo(() => analyzePsychTriggers(data), [data]);
  const diagScore = diagItems.reduce((s, i) => s + i.score, 0) + psychTriggers.reduce((s, t) => s + t.score, 0);
  const diagMax = diagItems.reduce((s, i) => s + i.maxScore, 0) + psychTriggers.reduce((s, t) => s + t.maxScore, 0);
  const diagPct = diagMax > 0 ? Math.round((diagScore / diagMax) * 100) : 0;

  const inputBase: React.CSSProperties = {
    width: '100%', padding: '12px 16px', borderRadius: 10,
    border: '1px solid #E2E8F0', fontSize: 16, outline: 'none',
    boxSizing: 'border-box', background: '#FFF',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F1F5F9' }}>
      <style>{`
        @media (max-width: 768px) {
          [data-ve-grid] { grid-template-columns: 1fr !important; }
          [data-psych-grid] { grid-template-columns: 1fr !important; }
          [data-price-grid] { grid-template-columns: 1fr !important; }
          [data-cta-grid] { flex-direction: column !important; }
          [data-cta-grid] > button { width: 100% !important; }
          [data-main] { padding: 16px 12px 60px !important; }
          [data-header-actions] button { padding: 6px 10px !important; font-size: 12px !important; }
          [data-tab-bar] { flex-wrap: wrap !important; }
          [data-tab-bar] > button { padding: 10px 14px !important; font-size: 14px !important; }
          [data-tab-bar] > div:last-child { width: 100% !important; flex: none !important; justify-content: center !important; padding: 6px 0 !important; border-top: 1px solid #1E293B; }
          [data-section-header] { flex-direction: column !important; gap: 2px !important; }
        }
        @media (max-width: 480px) {
          [data-main] { padding: 10px 6px 48px !important; }
          [data-header-actions] button { padding: 6px 8px !important; font-size: 11px !important; }
          [data-tab-bar] > button { padding: 8px 10px !important; font-size: 13px !important; }
        }
      `}</style>
      <input type="file" ref={fileInputRef} accept=".json" onChange={handleImport} style={{ display: 'none' }} />
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

            {lastSaved && (
              <div style={{ fontSize: 12, color: '#4ADE80', fontWeight: 500 }}>
                ✓ 保存済み {formatRelativeTime(lastSaved)}
              </div>
            )}

            <div data-header-actions="" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <button onClick={() => router.push('/manual')} style={{
                background: '#FEF3C7', border: 'none',
                borderRadius: 8, padding: '8px 12px', color: '#B45309', fontSize: 13, cursor: 'pointer', fontWeight: 600,
              }}>📖 使い方</button>
              <button onClick={exportJSON} style={{
                background: '#1E293B', border: '1px solid #334155',
                borderRadius: 8, padding: '8px 12px', color: '#64748B', fontSize: 13, cursor: 'pointer', fontWeight: 500,
              }}>↓ バックアップ</button>
              <button onClick={() => fileInputRef.current?.click()} style={{
                background: '#1E293B', border: '1px solid #334155',
                borderRadius: 8, padding: '8px 12px', color: '#64748B', fontSize: 13, cursor: 'pointer', fontWeight: 500,
              }}>↑ 復元</button>
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
                          <button onClick={() => duplicateOffer(o.id)} style={{
                            background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#CBD5E1',
                          }} title="複製">📋</button>
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
          <div data-tab-bar="" style={{ display: 'flex', alignItems: 'center', gap: 0, borderTop: '1px solid #1E293B' }}>
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
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <button onClick={copyToClipboard} style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 13,
                background: copied ? '#059669' : '#1E293B',
                border: '1px solid ' + (copied ? '#059669' : '#334155'),
                color: copied ? '#FFF' : '#94A3B8', cursor: 'pointer', fontWeight: 500,
              }}>{copied ? '✓ コピー' : '📋 コピー'}</button>
              <button onClick={downloadText} style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 13,
                background: '#1E293B', border: '1px solid #334155',
                color: '#94A3B8', cursor: 'pointer', fontWeight: 500,
              }}>📄 TXT</button>
              <button onClick={downloadPDF} style={{
                padding: '8px 14px', borderRadius: 8, fontSize: 13,
                background: '#1E293B', border: '1px solid #334155',
                color: '#94A3B8', cursor: 'pointer', fontWeight: 500,
              }}>📑 PDF</button>
            </div>
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
      <main data-main="" style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 80px' }}>
        {tab === 'diagnosis' ? (
          <DiagnosticPanel data={data} />
        ) : tab === 'preview' ? (
          <PDFPreview html={generatePDFHtml(false)} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            <Section title="基本情報" subtitle="商品の概要とメッセージ">
              {/* 入力モード切替 */}
              <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 10, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                {([
                  { id: 'manual' as const, label: '✏️ 手動入力', desc: '直接入力する' },
                  { id: 'concept' as const, label: '🔗 コンセプト設計から取り込み', desc: 'コンセプト設計アプリのデータを使用' },
                ] as const).map(mode => (
                  <button key={mode.id} onClick={() => setBasicInfoMode(mode.id)} style={{
                    flex: 1, padding: '14px 16px', border: 'none', cursor: 'pointer',
                    background: basicInfoMode === mode.id ? '#1E293B' : '#F8FAFC',
                    color: basicInfoMode === mode.id ? '#fff' : '#64748B',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: 15, fontWeight: 600 }}>{mode.label}</div>
                    <div style={{ fontSize: 12, marginTop: 2, opacity: 0.7 }}>{mode.desc}</div>
                  </button>
                ))}
              </div>

              {/* コンセプト貼り付けUI */}
              {basicInfoMode === 'concept' && (
                <div style={{ marginBottom: 20, padding: 20, background: '#F0F9FF', borderRadius: 12, border: '1px solid #BAE6FD' }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0369A1', marginBottom: 4 }}>コンセプトシートを貼り付け</div>
                  <div style={{ fontSize: 13, color: '#64748B', marginBottom: 12, lineHeight: 1.6 }}>
                    コンセプト設計アプリで生成したシートのHTMLまたはテキストをそのまま貼り付けてください
                  </div>
                  <textarea
                    value={conceptPasteText}
                    onChange={e => {
                      setConceptPasteText(e.target.value);
                      setConceptParsed(null);
                    }}
                    placeholder="コンセプトシートのHTML or テキストをここにペースト..."
                    rows={5}
                    style={{ ...inputBase, resize: 'vertical', fontSize: 14, fontFamily: 'monospace' }}
                  />
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    <button onClick={() => {
                      if (!conceptPasteText.trim()) return;
                      const parsed = parseConceptSheet(conceptPasteText);
                      setConceptParsed(parsed);
                    }} style={{
                      flex: 1, padding: '12px', background: '#0369A1', color: '#fff',
                      border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                    }}>
                      解析する
                    </button>
                    {conceptParsed && (
                      <button onClick={() => {
                        update(conceptParsed);
                        setConceptPasteText('');
                        setConceptParsed(null);
                        setBasicInfoMode('manual');
                      }} style={{
                        flex: 1, padding: '12px', background: '#2563EB', color: '#fff',
                        border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 700, cursor: 'pointer',
                      }}>
                        基本情報に反映する
                      </button>
                    )}
                  </div>

                  {/* 解析プレビュー */}
                  {conceptParsed && (
                    <div style={{ marginTop: 16, padding: 16, background: '#fff', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#059669', marginBottom: 12 }}>解析結果プレビュー（反映前に確認）</div>
                      {([
                        { key: 'productName', label: '商品名' },
                        { key: 'tagline', label: 'キャッチコピー' },
                        { key: 'targetPain', label: 'ターゲットの悩み' },
                        { key: 'desiredOutcome', label: '得られる結果' },
                      ] as const).map(f => {
                        const val = conceptParsed[f.key as keyof OfferData] as string | undefined;
                        return (
                          <div key={f.key} style={{ marginBottom: 10 }}>
                            <div style={{ fontSize: 12, color: '#64748B', fontWeight: 600 }}>{f.label}</div>
                            <div style={{ fontSize: 14, color: val ? '#1E293B' : '#CBD5E1', marginTop: 2, whiteSpace: 'pre-wrap' }}>
                              {val || '（検出できませんでした）'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {!data.productName && !data.tagline && !data.targetPain && !data.desiredOutcome && (
                <div style={{
                  padding: '14px 18px', borderRadius: 10, marginBottom: 16,
                  background: 'linear-gradient(135deg, #EEF2FF, #F0F9FF)',
                  border: '1px solid #C7D2FE',
                  fontSize: 13, color: '#4338CA', lineHeight: 1.6,
                }}>
                  まずは商品名とターゲットの悩みを入力しましょう。それだけで診断スコアが一気に上がります
                </div>
              )}
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
              <div data-ve-grid="" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 24px' }}>
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
              {!data.anchorPrice && data.priceTiers.every(t => !t.price) && (
                <div style={{
                  padding: '14px 18px', borderRadius: 10, marginBottom: 16,
                  background: 'linear-gradient(135deg, #EEF2FF, #F0F9FF)',
                  border: '1px solid #C7D2FE',
                  fontSize: 13, color: '#4338CA', lineHeight: 1.6,
                }}>
                  価格を入力するとアンカー効果や割引率が自動計算されます
                </div>
              )}
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
                        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2, alignItems: 'center' }}>
                          <button onClick={() => update({ priceTiers: moveItem(data.priceTiers, ti, ti - 1) })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8', padding: '2px 4px', opacity: ti === 0 ? 0.3 : 1 }}
                            disabled={ti === 0}>↑</button>
                          <button onClick={() => update({ priceTiers: moveItem(data.priceTiers, ti, ti + 1) })}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8', padding: '2px 4px', opacity: ti === data.priceTiers.length - 1 ? 0.3 : 1 }}
                            disabled={ti === data.priceTiers.length - 1}>↓</button>
                          {data.priceTiers.length > 1 && (
                            <button onClick={() => update({ priceTiers: data.priceTiers.filter((_, i) => i !== ti) })}
                              style={{ fontSize: 14, color: '#EF4444', background: 'none', border: 'none', cursor: 'pointer' }}>削除</button>
                          )}
                        </div>
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
              {data.bonuses.length === 0 && (
                <div style={{
                  padding: '14px 18px', borderRadius: 10, marginBottom: 16,
                  background: 'linear-gradient(135deg, #EEF2FF, #F0F9FF)',
                  border: '1px solid #C7D2FE',
                  fontSize: 13, color: '#4338CA', lineHeight: 1.6,
                }}>
                  本体と関連するが、別売りでも成立するものを特典にすると効果的
                </div>
              )}
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
                    <button onClick={() => update({ bonuses: moveItem(data.bonuses, i, i - 1) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8', padding: '2px 4px', opacity: i === 0 ? 0.3 : 1 }}
                      disabled={i === 0}>↑</button>
                    <button onClick={() => update({ bonuses: moveItem(data.bonuses, i, i + 1) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8', padding: '2px 4px', opacity: i === data.bonuses.length - 1 ? 0.3 : 1 }}
                      disabled={i === data.bonuses.length - 1}>↓</button>
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
                  <button onClick={() => update({ urgencyElements: moveItem(data.urgencyElements, i, i - 1) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8', padding: '2px 4px', opacity: i === 0 ? 0.3 : 1 }}
                    disabled={i === 0}>↑</button>
                  <button onClick={() => update({ urgencyElements: moveItem(data.urgencyElements, i, i + 1) })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8', padding: '2px 4px', opacity: i === data.urgencyElements.length - 1 ? 0.3 : 1 }}
                    disabled={i === data.urgencyElements.length - 1}>↓</button>
                  <button onClick={() => update({ urgencyElements: data.urgencyElements.filter((_, ii) => ii !== i) })}
                    style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                </div>
              ))}
              <button onClick={() => update({ urgencyElements: [...data.urgencyElements, { type: 'deadline', description: '' }] })}
                style={{ fontSize: 14, color: '#E11D48', background: '#FFF1F2', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>+ 緊急性を追加</button>
            </Section>

            <Section title="反論処理シート" subtitle="「買わない理由」を先回りして潰す">
              <div style={{ fontSize: 14, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
                見込み客が持つ「買わない理由」に対する回答を事前に準備しておくと、LPやセミナーで反論を潰せます。
              </div>
              {data.objections.map((obj, i) => (
                <div key={obj.id} style={{
                  padding: 18, borderRadius: 14, border: '1px solid #E2E8F0', background: '#FAFBFC', marginBottom: 10,
                }}>
                  <div style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#FEE2E2', color: '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>Q</div>
                    <input value={obj.objection} onChange={e => { const o = [...data.objections]; o[i] = { ...o[i], objection: e.target.value }; update({ objections: o }); }}
                      placeholder="反論（例: 高い、時間がない）" style={{ ...inputBase, flex: 1, fontWeight: 600 }} />
                    <button onClick={() => update({ objections: moveItem(data.objections, i, i - 1) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8', padding: '2px 4px', opacity: i === 0 ? 0.3 : 1 }}
                      disabled={i === 0}>↑</button>
                    <button onClick={() => update({ objections: moveItem(data.objections, i, i + 1) })}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#94A3B8', padding: '2px 4px', opacity: i === data.objections.length - 1 ? 0.3 : 1 }}
                      disabled={i === data.objections.length - 1}>↓</button>
                    <button onClick={() => update({ objections: data.objections.filter((_, ii) => ii !== i) })}
                      style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', fontSize: 16, flexShrink: 0 }}>✕</button>
                  </div>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>A</div>
                    <textarea value={obj.response} onChange={e => { const o = [...data.objections]; o[i] = { ...o[i], response: e.target.value }; update({ objections: o }); }}
                      placeholder="回答（なぜその心配は不要か、どう解決するか）" rows={2}
                      style={{ ...inputBase, flex: 1, resize: 'none' }} />
                  </div>
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => update({ objections: [...data.objections, { id: genId(), objection: '', response: '' }] })}
                  style={{ fontSize: 14, color: '#6366F1', background: '#EEF2FF', border: 'none', borderRadius: 8, padding: '10px 18px', cursor: 'pointer', fontWeight: 600 }}>+ 自由に追加</button>
                {OBJECTION_TEMPLATES.filter(t => !data.objections.some(o => o.objection === t.objection)).slice(0, 3).map(tmpl => (
                  <button key={tmpl.objection} onClick={() => update({ objections: [...data.objections, { id: genId(), objection: tmpl.objection, response: '' }] })}
                    style={{ fontSize: 13, color: '#64748B', background: '#F1F5F9', border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
                    + {tmpl.objection}
                  </button>
                ))}
              </div>
              {data.objections.length === 0 && (
                <div style={{ marginTop: 12, padding: 16, background: '#FEF2F2', borderRadius: 10, border: '1px solid #FECDD3' }}>
                  <div style={{ fontSize: 14, color: '#9F1239', fontWeight: 600, marginBottom: 4 }}>よくある3大反論</div>
                  <div style={{ fontSize: 13, color: '#BE123C', lineHeight: 1.6 }}>
                    「高い・お金がない」「時間がない」「自分にできるか不安」— この3つは必ず用意しましょう
                  </div>
                </div>
              )}

            </Section>

            {/* ── 反論処理アドバイザー（独立セクション） ── */}
            <ObjectionAdvisor data={data} onUpdate={update} />

            <Section title="CTA（行動喚起）" subtitle="ボタンに表示するテキスト">
              <Field label="CTAボタンのテキスト">
                <input value={data.ctaText} onChange={e => update({ ctaText: e.target.value })}
                  placeholder="例: 今すぐ申し込む" style={inputBase} />
              </Field>
              {/* CTA改善提案 */}
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#475569', marginBottom: 10 }}>CTA改善提案（クリックで適用）</div>
                <div data-cta-grid="" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {generateCtaSuggestions(data).map((s, i) => (
                    <button key={i} onClick={() => update({ ctaText: s.text })} style={{
                      padding: '10px 16px', borderRadius: 10, cursor: 'pointer',
                      border: data.ctaText === s.text ? '2px solid #6366F1' : '1px solid #E2E8F0',
                      background: data.ctaText === s.text ? '#EEF2FF' : '#FFF',
                      fontSize: 14, color: '#334155', textAlign: 'left', transition: 'all 0.15s',
                    }}>
                      <div style={{ fontWeight: 600 }}>{s.text}</div>
                      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{s.reason}</div>
                    </button>
                  ))}
                </div>
              </div>
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

// ─── PDFプレビュー ──────────────────────────────────

function PDFPreview({ html }: { html: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }, [html]);

  return (
    <div style={{ background: '#64748B', borderRadius: 16, padding: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
      <div style={{ fontSize: 13, color: '#CBD5E1', marginBottom: 12, textAlign: 'center', fontWeight: 500 }}>
        PDF出力プレビュー — ダウンロードされるPDFと同じ内容です
      </div>
      <iframe
        ref={iframeRef}
        style={{
          width: '100%', minHeight: 900, border: 'none', borderRadius: 8,
          background: '#FFF', boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
        }}
        title="PDF Preview"
      />
    </div>
  );
}


// ─── 反論処理アドバイザー ─────────────────────────

function ObjectionAdvisor({ data, onUpdate }: { data: OfferData; onUpdate: (partial: Partial<OfferData>) => void }) {
  const advices = useMemo(() => analyzeObjectionGaps(data), [data]);
  const totalGaps = advices.reduce((s, a) => s + a.offerGaps.length, 0);
  const answeredCount = advices.filter(a => a.hasResponse).length;
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const fixTypeLabels: Record<string, { label: string; color: string; bg: string }> = {
    bonus: { label: '特典追加', color: '#B45309', bg: '#FEF3C7' },
    urgency: { label: '緊急性追加', color: '#E11D48', bg: '#FFF1F2' },
    pricing: { label: '価格設計', color: '#6366F1', bg: '#EEF2FF' },
    content: { label: '内容補強', color: '#0369A1', bg: '#F0F9FF' },
  };

  // 常に表示（反論0件でもオファー補強提案を出す）

  return (
    <div style={{ background: '#FFF', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div data-section-header="" style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0F172A', margin: 0 }}>反論処理アドバイザー</h3>
        <div style={{
          fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
          background: totalGaps === 0 ? '#DCFCE7' : totalGaps <= 3 ? '#FEF9C3' : '#FEF2F2',
          color: totalGaps === 0 ? '#16A34A' : totalGaps <= 3 ? '#CA8A04' : '#DC2626',
        }}>
          {totalGaps === 0 ? '全反論カバー済み' : `補強ポイント ${totalGaps}件`}
        </div>
        <span style={{ fontSize: 14, color: '#94A3B8' }}>オファーの弱点を分析し、反論を潰す準備をする</span>
      </div>
      <div style={{ padding: 24 }}>
      <div style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.6 }}>
        今のオファー内容（特典・価格・緊急性）で各反論に対応できるか自動分析しています。足りない要素は「オファー補強」として提案します。回答を用意すればFAQ形式でLP・セミナーにそのまま使えます。
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {advices.map((advice, idx) => {
          const existing = data.objections.find(o => o.objection === advice.objection);
          const isExpanded = expandedIdx === idx;

          return (
            <div key={advice.objection} style={{
              borderRadius: 12, overflow: 'hidden',
              border: `1px solid ${advice.faqReady ? '#BBF7D0' : advice.hasResponse ? '#FDE68A' : '#FED7AA'}`,
              background: advice.faqReady ? '#F0FDF4' : '#FFF',
            }}>
              <button onClick={() => setExpandedIdx(isExpanded ? null : idx)} style={{
                width: '100%', padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700,
                  background: advice.faqReady ? '#DCFCE7' : advice.hasResponse ? '#FEF9C3' : '#FFEDD5',
                  color: advice.faqReady ? '#16A34A' : advice.hasResponse ? '#CA8A04' : '#EA580C',
                }}>
                  {advice.faqReady ? '✓' : advice.hasResponse ? '!' : '✕'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#0F172A' }}>「{advice.objection}」</div>
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    {advice.faqReady ? 'FAQ掲載OK — 回答・オファーともに準備完了'
                      : advice.hasResponse && advice.offerGaps.length === 0 ? '回答済み'
                      : advice.hasResponse ? `回答済み・オファー補強${advice.offerGaps.length}件`
                      : `未回答・オファー補強${advice.offerGaps.length}件`}
                  </div>
                </div>
                {advice.offerGaps.length > 0 && (
                  <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                    {[...new Set(advice.offerGaps.map(g => g.fixType))].map(type => {
                      const ft = fixTypeLabels[type];
                      return <span key={type} style={{ fontSize: 10, fontWeight: 600, padding: '2px 6px', borderRadius: 4, background: ft.bg, color: ft.color }}>{ft.label}</span>;
                    })}
                  </div>
                )}
                <span style={{ fontSize: 14, color: '#94A3B8', flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</span>
              </button>

              {isExpanded && (
                <div style={{ padding: '0 16px 16px', borderTop: '1px solid #F1F5F9' }}>
                  {/* 回答例の提案 */}
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 6 }}>回答テンプレート（クリックで反映）</div>
                    <button onClick={() => {
                      if (existing) {
                        const o = data.objections.map(obj => obj.id === existing.id ? { ...obj, response: advice.suggestedResponse } : obj);
                        onUpdate({ objections: o });
                      } else {
                        onUpdate({ objections: [...data.objections, { id: genId(), objection: advice.objection, response: advice.suggestedResponse }] });
                      }
                    }} style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                      border: '1px dashed #C7D2FE', background: '#FAFAFF', fontSize: 13, color: '#334155', lineHeight: 1.6,
                    }}>
                      {advice.suggestedResponse}
                    </button>
                  </div>

                  {/* オファー補強提案 */}
                  {advice.offerGaps.length > 0 && (
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>
                        この反論を潰すためのオファー補強
                      </div>
                      {advice.offerGaps.map((gap, gi) => {
                        const ft = fixTypeLabels[gap.fixType];
                        return (
                          <div key={gi} style={{
                            padding: '12px 14px', borderRadius: 10, marginBottom: 6,
                            background: '#F8FAFC', border: '1px solid #E2E8F0',
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: ft.bg, color: ft.color }}>{ft.label}</span>
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#DC2626' }}>{gap.gap}</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.5 }}>
                              → {gap.fix}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* FAQ掲載ステータス */}
                  <div style={{
                    marginTop: 12, padding: '10px 14px', borderRadius: 8, fontSize: 12,
                    background: advice.faqReady ? '#F0FDF4' : '#FFF7ED',
                    border: `1px solid ${advice.faqReady ? '#BBF7D0' : '#FED7AA'}`,
                    color: advice.faqReady ? '#166534' : '#9A3412',
                    fontWeight: 500,
                  }}>
                    {advice.faqReady
                      ? '→ FAQ / LP / セミナーで使える状態です。プレビュータブでFAQ形式を確認できます'
                      : '→ 回答を記入してオファー補強を行うと、FAQ形式でLP・セミナーに使えるようになります'}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// ─── 編集用コンポーネント ────────────────────────

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#FFF', borderRadius: 16, overflow: 'hidden', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
      <div data-section-header="" style={{ padding: '18px 24px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'baseline', gap: 10 }}>
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
