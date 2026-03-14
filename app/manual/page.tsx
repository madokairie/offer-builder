'use client';

import { useRouter } from 'next/navigation';

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mb-10 scroll-mt-20">
      <h2 className="text-lg font-bold mb-4 pb-2 border-b-2" style={{ color: '#6366F1', borderColor: '#6366F1' }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-bold mt-5 mb-2" style={{ color: '#0F172A' }}>{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed mb-3" style={{ color: '#475569' }}>{children}</p>;
}

function Tip({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg my-3" style={{ background: '#F0FDF4', borderLeft: '3px solid #059669' }}>
      <p className="text-xs" style={{ color: '#065F46' }}>💡 {children}</p>
    </div>
  );
}

function Important({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-3 rounded-lg my-3" style={{ background: '#FEF2F2', borderLeft: '3px solid #DC2626' }}>
      <p className="text-xs" style={{ color: '#991B1B' }}>⚠️ {children}</p>
    </div>
  );
}

function Steps({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2 my-3">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm" style={{ color: '#475569' }}>
          <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: '#6366F1' }}>
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function FeatureCard({ label, desc }: { label: string; desc: string }) {
  return (
    <div className="p-3 rounded-lg" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0' }}>
      <span className="text-xs font-bold" style={{ color: '#6366F1' }}>{label}</span>
      <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{desc}</p>
    </div>
  );
}

export default function ManualPage() {
  const router = useRouter();

  const toc = [
    { id: 'overview', title: '全体の流れ' },
    { id: 'basic', title: '基本情報を入力する' },
    { id: 'value-equation', title: '価値方程式を設計する' },
    { id: 'pricing', title: '価格設計' },
    { id: 'bonuses', title: '特典スタッキング' },
    { id: 'urgency', title: '緊急性・希少性' },
    { id: 'objections', title: '反論処理' },
    { id: 'objection-advisor', title: '反論処理アドバイザー' },
    { id: 'cta', title: 'CTA（行動喚起）' },
    { id: 'diagnosis', title: '診断タブの見方' },
    { id: 'export', title: '出力・エクスポート' },
    { id: 'multi-offer', title: '複数オファー管理' },
    { id: 'backup', title: 'バックアップと復元' },
    { id: 'tips', title: '効果的なオファーの作り方' },
  ];

  return (
    <div className="min-h-screen" style={{ background: '#FAFBFC' }}>
      <header className="border-b" style={{ borderColor: '#E2E8F0', background: '#FFF' }}>
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-3">
          <button onClick={() => router.push('/')} className="text-sm hover:opacity-70" style={{ color: '#94A3B8' }}>
            ← トップに戻る
          </button>
          <h1 className="text-base font-bold" style={{ color: '#6366F1' }}>📖 使い方マニュアル</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 flex gap-8">
        {/* TOC */}
        <nav className="w-48 flex-shrink-0 hidden md:block">
          <div className="sticky top-8 space-y-1.5">
            <div className="text-xs font-bold mb-3" style={{ color: '#6366F1' }}>目次</div>
            {toc.map(item => (
              <a key={item.id} href={`#${item.id}`} className="block text-xs py-1 hover:opacity-70 transition-colors" style={{ color: '#475569' }}>
                {item.title}
              </a>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">

          <Section id="overview" title="全体の流れ">
            <P>Offer Builderは、アレックス・ホルモジの「価値方程式」をベースに、売れるオファーを設計するツールです。入力 → 診断 → 改善のサイクルを繰り返して、成約率の高いオファーに仕上げます。</P>
            <Steps items={[
              '✏️ 基本情報 — 商品名・ターゲットの悩み・得られる結果を入力',
              '⚖️ 価値方程式 — 4つの軸でオファーの「価値」を設計',
              '💰 価格・特典・緊急性 — 松竹梅の価格設計、特典スタッキング、希少性の演出',
              '🛡️ 反論処理 — 「買わない理由」を先回りして潰す＋アドバイザーで強化',
              '📊 診断 — スコア100点満点で現在のオファー品質を可視化',
              '📤 出力 — PDF・TXT・クリップボードに出力してLP・セミナーで活用',
            ]} />
            <Tip>まずは基本情報だけ入力して「診断」タブを見てください。何が足りないか一目で分かります。</Tip>
          </Section>

          <Section id="basic" title="基本情報を入力する">
            <P>「編集」タブの最初のセクションです。2つの入力方法から選べます。</P>
            <H3>手動入力</H3>
            <P>各フィールドに直接入力します。最低限「商品名」と「ターゲットの悩み」を埋めるだけで診断スコアが大きく上がります。</P>
            <div className="space-y-2 my-3">
              <FeatureCard label="商品名" desc="サービスや講座の名前。プレビューやPDFのタイトルに反映されます" />
              <FeatureCard label="キャッチコピー" desc="一言で価値を伝えるフレーズ。PDFの表紙に大きく表示されます" />
              <FeatureCard label="ターゲットの悩み" desc="見込み客が抱える具体的な痛み。反論処理アドバイザーの提案にも影響します" />
              <FeatureCard label="得られる結果" desc="このオファーで手に入る理想の未来。CTAコピーの自動生成にも使われます" />
            </div>

            <H3>コンセプト設計から取り込み</H3>
            <P>「コンセプト設計」アプリで作成したシートのHTMLまたはテキストを貼り付けると、商品名・キャッチコピー・ターゲットの悩み・得られる結果を自動で抽出します。</P>
            <Steps items={[
              'コンセプト設計アプリでシートを表示',
              '全選択（Cmd+A）してコピー（Cmd+C）',
              'Offer Builderの「コンセプト設計から取り込み」に切り替え',
              'テキストエリアに貼り付けて「解析する」をクリック',
              '解析結果を確認して「基本情報に反映する」をクリック',
            ]} />
            <Tip>HTMLごとコピーすると精度が上がります。テキストだけでも解析できますが、構造化された情報の方が正確に取り込めます。</Tip>
          </Section>

          <Section id="value-equation" title="価値方程式を設計する">
            <P>ホルモジの価値方程式は「オファーの価値 = (理想の結果 × 達成可能性) ÷ (時間 × 労力)」で表されます。4つのスライダーで現在のオファーがどこに位置するかを把握できます。</P>
            <div className="space-y-2 my-3">
              <FeatureCard label="理想の結果（高い = 良い）" desc="得られる結果の大きさ。収入・時間・健康など、変化のインパクトが大きいほど高スコア" />
              <FeatureCard label="達成可能性（高い = 良い）" desc="「本当にできる」と信じてもらえるか。実績・保証・ステップの明確さで上がる" />
              <FeatureCard label="時間の速さ（高い = 良い）" desc="結果が出るまでの速さ。「3ヶ月で」より「30日で」の方が高い" />
              <FeatureCard label="労力の少なさ（高い = 良い）" desc="お客さんに求める努力の量。テンプレ・ツール提供で「楽にできる」と思わせる" />
            </div>
            <P>各項目にはスコアに応じた改善ヒントが表示されます。低い項目を見つけたら、ヒントを参考にオファーの内容を強化しましょう。</P>
            <Important>分子（結果・可能性）を上げるか、分母（時間・労力）を下げるのがオファー改善の基本戦略です。4つ全部を同時に上げようとせず、まず1つにフォーカスしましょう。</Important>
          </Section>

          <Section id="pricing" title="価格設計">
            <P>松竹梅の価格プラン、アンカー価格（通常価格）、分割払いオプションを設定できます。</P>
            <H3>価格プラン（松竹梅）</H3>
            <P>「+ プランを追加」で価格帯を作成します。各プランには名前・価格・説明・含まれる内容を設定でき、おすすめプランを1つ選べます。</P>
            <Steps items={[
              'プラン名（例: ライト / スタンダード / プレミアム）を入力',
              '価格と説明を入力',
              '「含まれるもの」に箇条書きで内容を追加',
              'おすすめプランの ★ ボタンを押してハイライト表示',
            ]} />
            <Tip>3つのプランを用意すると、真ん中が最も選ばれやすくなります（松竹梅の法則）。おすすめしたいプランを真ん中に置きましょう。</Tip>

            <H3>アンカー価格</H3>
            <P>「通常価格」を設定すると、プレビューやPDFで打ち消し線付きで表示され、実際の価格がお得に見えます。</P>

            <H3>分割払い</H3>
            <P>「+ 分割払いを追加」で支払いオプション（例: 「月額9,800円×6回」「3回分割対応」）を追加できます。</P>
          </Section>

          <Section id="bonuses" title="特典スタッキング">
            <P>メインの商品に加えて、特典を積み上げることでオファーの知覚価値を大幅に引き上げます。</P>
            <Steps items={[
              '「+ 特典を追加」で特典カードを作成',
              '特典名、説明、金額相当（例: 29,800円相当）を入力',
              '↑↓ ボタンで並び順を調整',
            ]} />
            <Tip>特典の金額を設定すると、プレビューで「特典総額 ○○円相当」が自動計算・表示されます。知覚価値を最大化するには特典にも値段を付けましょう。</Tip>
            <P>初めて特典を追加する際は、画面上部に「特典の考え方」のガイドカードが表示されます。</P>
          </Section>

          <Section id="urgency" title="緊急性・希少性">
            <P>「今すぐ申し込む理由」を作るセクションです。5種類の緊急性タイプから選べます。</P>
            <div className="space-y-2 my-3">
              <FeatureCard label="⏰ 期限" desc="「○月○日まで」「残り3日」など、締め切りを設定" />
              <FeatureCard label="👥 人数制限" desc="「先着10名」「残り3枠」など、定員を設定" />
              <FeatureCard label="🎁 早期特典" desc="「今週中のお申し込みで○○プレゼント」など" />
              <FeatureCard label="📈 値上げ予告" desc="「来月から正規料金○○円に戻ります」など" />
              <FeatureCard label="⚡ カスタム" desc="上記に当てはまらない独自の緊急性を設定" />
            </div>
          </Section>

          <Section id="objections" title="反論処理シート">
            <P>見込み客が持つ「買わない理由」への回答を準備するセクションです。</P>
            <H3>追加方法は2つ</H3>
            <P><strong>「+ 自由に追加」</strong>: 空のQ&Aカードを追加して自由に入力します。</P>
            <P><strong>テンプレートボタン</strong>: 「高い・お金がない」「時間がない」「自分にできるか不安」など、よくある反論をワンクリックで追加できます。</P>
            <Tip>最低限「高い」「時間がない」「自分にできるか不安」の3つは必ず用意しましょう。この3つでほとんどの見込み客の不安をカバーできます。</Tip>
          </Section>

          <Section id="objection-advisor" title="反論処理アドバイザー">
            <P>反論処理シートの下に表示される独立セクションです。現在のオファー内容を分析し、各反論に対して「何が足りないか」「どう強化すべきか」を具体的に提案します。</P>

            <H3>ステータスバッジの見方</H3>
            <div className="space-y-2 my-3">
              <FeatureCard label="✓ FAQ Ready（緑）" desc="回答が書かれていて、かつオファー内容にも不足がない状態。LPやセミナーでそのまま使えます" />
              <FeatureCard label="! 要改善（黄色）" desc="回答はあるが、オファー自体に足りない要素がある。提案された改善を実施しましょう" />
              <FeatureCard label="✕ 未対応（赤）" desc="回答がまだ書かれていない。「提案を適用」ボタンで回答テンプレートを自動セットできます" />
            </div>

            <H3>オファーギャップ分析</H3>
            <P>各反論カードを開くと、現在のオファーに足りない要素とその改善策が表示されます。</P>
            <div className="space-y-2 my-3">
              <FeatureCard label="特典追加" desc="価格への不安を和らげるために特典を追加する提案" />
              <FeatureCard label="緊急性追加" desc="「今すぐ決めなくても…」を防ぐ期限や限定の設定提案" />
              <FeatureCard label="価格設計" desc="分割払い・アンカー価格・ROI提示などの価格戦略" />
              <FeatureCard label="内容補強" desc="実績・事例・保証などの追加で信頼性を高める提案" />
            </div>

            <H3>回答テンプレートの自動適用</H3>
            <P>各反論の「提案を適用」ボタンを押すと、あなたのオファー内容（商品名、得られる結果、価格など）に基づいた回答テンプレートが自動で反論処理シートに反映されます。適用後、内容を自分の言葉に調整してください。</P>

            <Tip>すべての反論が「✓ FAQ Ready」になれば、LP・セミナー・個別相談で使えるFAQ一覧の完成です。PDFにも自動で含まれます。</Tip>
          </Section>

          <Section id="cta" title="CTA（行動喚起）">
            <P>ボタンに表示するテキストを設定します。直接入力するか、CTA改善提案からワンクリックで選択できます。</P>
            <P>提案は入力済みの商品名や得られる結果に基づいて自動生成されます。ボタンに収まる短いコピーが生成されるので、LPやメールにそのまま使えます。</P>
          </Section>

          <Section id="diagnosis" title="診断タブの見方">
            <P>「診断」タブでは、現在のオファーを100点満点で自動スコアリングします。</P>

            <H3>オファー診断（ルールベース）</H3>
            <P>ホルモジの価値方程式に基づく12項目のチェックリストです。各項目に改善アドバイスが付いており、スコアの低い項目から対処するのが効率的です。</P>
            <div className="space-y-2 my-3">
              <FeatureCard label="基本情報" desc="商品名・キャッチコピー・ターゲットの悩み・得られる結果" />
              <FeatureCard label="価格設計" desc="プラン設計・アンカー価格・分割払い" />
              <FeatureCard label="付加価値" desc="特典のボリューム・緊急性・保証" />
              <FeatureCard label="行動喚起" desc="CTA・反論処理" />
            </div>

            <H3>心理トリガー分析（7項目）</H3>
            <P>社会的証明・権威性・希少性・緊急性・返報性・損失回避・反論処理の7つの心理トリガーがどれだけオファーに組み込まれているかを可視化します。</P>
            <Tip>診断スコアはタブバーにもリアルタイムで表示されます。「診断 78点」のように見えるので、入力しながら点数の変化を追えます。</Tip>
          </Section>

          <Section id="export" title="出力・エクスポート">
            <P>完成したオファーは3つの形式で出力できます。タブバーの右端にボタンがあります。</P>

            <H3>📋 コピー</H3>
            <P>テキスト形式でクリップボードにコピーします。メール・チャット・ドキュメントにそのまま貼り付けられます。FAQ（反論処理で回答済みの項目）も含まれます。</P>

            <H3>📄 TXT</H3>
            <P>テキストファイルとしてダウンロードします。FAQ（回答済み）と未回答の反論が分かれて出力されるため、対応状況の把握にも使えます。</P>

            <H3>📑 PDF</H3>
            <P>ブラウザの印刷機能でPDFとして保存します。デザイン付きのレポート形式で、オファー診断スコア・価値方程式・価格プラン・特典・FAQ・心理トリガーがすべて含まれます。</P>
            <Steps items={[
              '「📑 PDF」をクリック',
              '新しいタブに印刷プレビューが開く',
              '「送信先」を「PDFとして保存」に変更',
              '「保存」をクリック',
            ]} />

            <H3>プレビュータブ</H3>
            <P>「プレビュー」タブでは、PDFダウンロード時と同じ内容をリアルタイムで確認できます。入力しながらPDFの仕上がりを確認するのに便利です。</P>
          </Section>

          <Section id="multi-offer" title="複数オファー管理">
            <P>ヘッダー右端のオファー名をクリックすると、オファー一覧が表示されます。</P>
            <div className="space-y-2 my-3">
              <FeatureCard label="+ 新しいオファー" desc="空のオファーを新規作成" />
              <FeatureCard label="📋 複製" desc="既存オファーをコピーしてA/Bテスト用の別バージョンを作成" />
              <FeatureCard label="✕ 削除" desc="不要なオファーを削除（最低1つは残ります）" />
            </div>
            <P>テンプレートからの作成も可能です。「+ テンプレート」ボタンから業種別のサンプルオファーを読み込めます。</P>
            <Tip>複製機能を使えば、同じ商品の「通常版」と「上位版」を簡単に作り分けられます。価格や特典だけ変えてA/Bテストしましょう。</Tip>
          </Section>

          <Section id="backup" title="バックアップと復元">
            <P>ヘッダーの「↓ バックアップ」ボタンで全オファーデータをJSONファイルに保存できます。「↑ 復元」ボタンでファイルを読み込むと、保存した全オファーが復元されます。</P>
            <Important>データはブラウザのlocalStorageに保存されています。ブラウザのキャッシュ消去やシークレットモードでは消えてしまうため、定期的なバックアップを推奨します。</Important>
            <P>自動保存はリアルタイムで行われます。ヘッダーに「✓ 保存済み ○秒前」と表示されるので、保存状態をいつでも確認できます。</P>
          </Section>

          <Section id="tips" title="効果的なオファーの作り方">
            <H3>ホルモジの価値方程式を意識する</H3>
            <P>オファーの価値 = (理想の結果 × 達成可能性) ÷ (時間 × 労力)。分子を大きく、分母を小さくするのが鉄則です。</P>
            <Steps items={[
              '「結果」を大きくする — 得られるベネフィットを具体的な数字で示す',
              '「可能性」を上げる — 事例・保証・ステップの明確化で「自分にもできる」と感じさせる',
              '「時間」を短くする — 最速ルートを提供する。テンプレート・ツール・速習コースなど',
              '「労力」を減らす — Done-For-You要素を入れる。代行・テンプレ・チェックリスト提供',
            ]} />

            <H3>特典は「時間短縮」と「労力削減」に使う</H3>
            <P>特典を追加するときは、メイン商品が解決しきれない「時間」と「労力」を補完するものを選びましょう。テンプレート集・チェックリスト・ツール・個別サポートは最も効果的な特典です。</P>

            <H3>反論を「オファーの改善ポイント」として活用する</H3>
            <P>反論処理アドバイザーが提案する「オファーギャップ」は、そのまま商品改善のToDoリストになります。「高い」と言われるなら分割払いや保証を追加、「自分にできるか」不安なら事例やステップ解説を追加、というように反論を起点にオファーを強化しましょう。</P>

            <H3>診断スコア80点以上を目指す</H3>
            <P>80点を超えるとオファーの基本要素が一通り揃っている状態です。まずは80点を目標に各セクションを埋め、その後は心理トリガーの充実で90点以上を目指しましょう。</P>

            <Tip>完璧なオファーを一度で作ろうとせず、「入力 → 診断 → 改善」のサイクルを3回ほど回すと効率よく仕上がります。</Tip>
          </Section>

        </div>
      </main>
    </div>
  );
}
