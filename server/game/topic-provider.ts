/** カテゴリ付きお題データ */
interface TopicEntry {
  readonly word: string;
  readonly category: string;
}

const TOPICS: readonly TopicEntry[] = [
  // 一般名詞 (30)
  { word: '時計', category: '一般名詞' },
  { word: '鏡', category: '一般名詞' },
  { word: '傘', category: '一般名詞' },
  { word: '枕', category: '一般名詞' },
  { word: '手紙', category: '一般名詞' },
  { word: '花火', category: '一般名詞' },
  { word: '地図', category: '一般名詞' },
  { word: '電池', category: '一般名詞' },
  { word: '風船', category: '一般名詞' },
  { word: '階段', category: '一般名詞' },
  { word: '信号', category: '一般名詞' },
  { word: '切手', category: '一般名詞' },
  { word: '鍵', category: '一般名詞' },
  { word: '窓', category: '一般名詞' },
  { word: '橋', category: '一般名詞' },
  { word: 'カレンダー', category: '一般名詞' },
  { word: '電話', category: '一般名詞' },
  { word: '財布', category: '一般名詞' },
  { word: 'メガネ', category: '一般名詞' },
  { word: '帽子', category: '一般名詞' },
  { word: '靴', category: '一般名詞' },
  { word: 'ハサミ', category: '一般名詞' },
  { word: 'ロウソク', category: '一般名詞' },
  { word: '指輪', category: '一般名詞' },
  { word: 'マイク', category: '一般名詞' },
  { word: 'カメラ', category: '一般名詞' },
  { word: '扇風機', category: '一般名詞' },
  { word: '新聞', category: '一般名詞' },
  { word: '掃除機', category: '一般名詞' },
  { word: '冷蔵庫', category: '一般名詞' },

  // 食べ物 (30)
  { word: 'カレー', category: '食べ物' },
  { word: '寿司', category: '食べ物' },
  { word: 'ラーメン', category: '食べ物' },
  { word: 'たこ焼き', category: '食べ物' },
  { word: 'おにぎり', category: '食べ物' },
  { word: 'チョコレート', category: '食べ物' },
  { word: 'ピザ', category: '食べ物' },
  { word: '餃子', category: '食べ物' },
  { word: 'プリン', category: '食べ物' },
  { word: 'うどん', category: '食べ物' },
  { word: 'ハンバーグ', category: '食べ物' },
  { word: '味噌汁', category: '食べ物' },
  { word: 'アイスクリーム', category: '食べ物' },
  { word: '天ぷら', category: '食べ物' },
  { word: 'パンケーキ', category: '食べ物' },
  { word: 'ステーキ', category: '食べ物' },
  { word: 'お好み焼き', category: '食べ物' },
  { word: 'ケーキ', category: '食べ物' },
  { word: 'そば', category: '食べ物' },
  { word: '焼き鳥', category: '食べ物' },
  { word: 'オムライス', category: '食べ物' },
  { word: 'サンドイッチ', category: '食べ物' },
  { word: 'ドーナツ', category: '食べ物' },
  { word: '唐揚げ', category: '食べ物' },
  { word: 'おでん', category: '食べ物' },
  { word: 'マカロン', category: '食べ物' },
  { word: '焼肉', category: '食べ物' },
  { word: 'クレープ', category: '食べ物' },
  { word: '肉まん', category: '食べ物' },
  { word: 'わたあめ', category: '食べ物' },

  // 動物 (30)
  { word: 'ペンギン', category: '動物' },
  { word: 'イルカ', category: '動物' },
  { word: 'パンダ', category: '動物' },
  { word: 'カメレオン', category: '動物' },
  { word: 'フクロウ', category: '動物' },
  { word: 'クジラ', category: '動物' },
  { word: 'ハムスター', category: '動物' },
  { word: 'コアラ', category: '動物' },
  { word: 'カンガルー', category: '動物' },
  { word: 'キリン', category: '動物' },
  { word: 'ゴリラ', category: '動物' },
  { word: 'ラッコ', category: '動物' },
  { word: 'フラミンゴ', category: '動物' },
  { word: 'カピバラ', category: '動物' },
  { word: 'アルパカ', category: '動物' },
  { word: 'ライオン', category: '動物' },
  { word: 'ゾウ', category: '動物' },
  { word: 'カメ', category: '動物' },
  { word: 'タコ', category: '動物' },
  { word: 'カブトムシ', category: '動物' },
  { word: 'ワシ', category: '動物' },
  { word: 'サメ', category: '動物' },
  { word: 'クラゲ', category: '動物' },
  { word: 'オオカミ', category: '動物' },
  { word: 'ナマケモノ', category: '動物' },
  { word: 'チーター', category: '動物' },
  { word: 'ヘビ', category: '動物' },
  { word: 'モグラ', category: '動物' },
  { word: 'タツノオトシゴ', category: '動物' },
  { word: 'ホタル', category: '動物' },

  // 場所 (25)
  { word: '図書館', category: '場所' },
  { word: '遊園地', category: '場所' },
  { word: '水族館', category: '場所' },
  { word: '映画館', category: '場所' },
  { word: '温泉', category: '場所' },
  { word: 'コンビニ', category: '場所' },
  { word: '神社', category: '場所' },
  { word: '空港', category: '場所' },
  { word: '動物園', category: '場所' },
  { word: 'プラネタリウム', category: '場所' },
  { word: 'キャンプ場', category: '場所' },
  { word: '展望台', category: '場所' },
  { word: 'ボウリング場', category: '場所' },
  { word: '美術館', category: '場所' },
  { word: '灯台', category: '場所' },
  { word: 'お城', category: '場所' },
  { word: 'スタジアム', category: '場所' },
  { word: '砂漠', category: '場所' },
  { word: '洞窟', category: '場所' },
  { word: '病院', category: '場所' },
  { word: '郵便局', category: '場所' },
  { word: '公園', category: '場所' },
  { word: '駅', category: '場所' },
  { word: '海', category: '場所' },

  // IT用語 (20)
  { word: 'クラウド', category: 'IT用語' },
  { word: 'アルゴリズム', category: 'IT用語' },
  { word: 'ブラウザ', category: 'IT用語' },
  { word: 'サーバー', category: 'IT用語' },
  { word: 'データベース', category: 'IT用語' },
  { word: 'プログラミング', category: 'IT用語' },
  { word: 'Wi-Fi', category: 'IT用語' },
  { word: 'アプリ', category: 'IT用語' },
  { word: 'パスワード', category: 'IT用語' },
  { word: 'ハッカー', category: 'IT用語' },
  { word: 'ストレージ', category: 'IT用語' },
  { word: 'API', category: 'IT用語' },
  { word: 'Bluetooth', category: 'IT用語' },
  { word: 'AI', category: 'IT用語' },
  { word: 'VPN', category: 'IT用語' },
  { word: 'ロボット', category: 'IT用語' },
  { word: 'ドローン', category: 'IT用語' },
  { word: 'SNS', category: 'IT用語' },
  { word: 'QRコード', category: 'IT用語' },
  { word: 'ストリーミング', category: 'IT用語' },

  // スポーツ (25)
  { word: '野球', category: 'スポーツ' },
  { word: 'サッカー', category: 'スポーツ' },
  { word: '水泳', category: 'スポーツ' },
  { word: 'テニス', category: 'スポーツ' },
  { word: 'スキー', category: 'スポーツ' },
  { word: 'バスケットボール', category: 'スポーツ' },
  { word: 'マラソン', category: 'スポーツ' },
  { word: '柔道', category: 'スポーツ' },
  { word: '相撲', category: 'スポーツ' },
  { word: 'サーフィン', category: 'スポーツ' },
  { word: 'ゴルフ', category: 'スポーツ' },
  { word: 'バレーボール', category: 'スポーツ' },
  { word: 'ボクシング', category: 'スポーツ' },
  { word: 'スケート', category: 'スポーツ' },
  { word: '卓球', category: 'スポーツ' },
  { word: '剣道', category: 'スポーツ' },
  { word: '体操', category: 'スポーツ' },
  { word: 'ダンス', category: 'スポーツ' },
  { word: '弓道', category: 'スポーツ' },
  { word: 'ラグビー', category: 'スポーツ' },
  { word: 'バドミントン', category: 'スポーツ' },
  { word: 'フェンシング', category: 'スポーツ' },
  { word: '登山', category: 'スポーツ' },
  { word: '釣り', category: 'スポーツ' },
  { word: 'ヨガ', category: 'スポーツ' },

  // 季節・行事 (25)
  { word: '花見', category: '季節・行事' },
  { word: 'クリスマス', category: '季節・行事' },
  { word: 'お正月', category: '季節・行事' },
  { word: 'ハロウィン', category: '季節・行事' },
  { word: 'バレンタイン', category: '季節・行事' },
  { word: '七夕', category: '季節・行事' },
  { word: '節分', category: '季節・行事' },
  { word: '運動会', category: '季節・行事' },
  { word: '入学式', category: '季節・行事' },
  { word: '卒業式', category: '季節・行事' },
  { word: '夏祭り', category: '季節・行事' },
  { word: '年末', category: '季節・行事' },
  { word: '梅雨', category: '季節・行事' },
  { word: '紅葉', category: '季節・行事' },
  { word: '雪', category: '季節・行事' },
  { word: '誕生日', category: '季節・行事' },
  { word: '結婚式', category: '季節・行事' },
  { word: 'お盆', category: '季節・行事' },
  { word: 'ひな祭り', category: '季節・行事' },
  { word: 'こどもの日', category: '季節・行事' },
  { word: '大晦日', category: '季節・行事' },
  { word: '初詣', category: '季節・行事' },
  { word: '台風', category: '季節・行事' },
  { word: '衣替え', category: '季節・行事' },
  { word: '年賀状', category: '季節・行事' },

  // 職業 (20)
  { word: '医者', category: '職業' },
  { word: '消防士', category: '職業' },
  { word: '警察官', category: '職業' },
  { word: 'パイロット', category: '職業' },
  { word: 'シェフ', category: '職業' },
  { word: '先生', category: '職業' },
  { word: '宇宙飛行士', category: '職業' },
  { word: '大工', category: '職業' },
  { word: '漁師', category: '職業' },
  { word: '農家', category: '職業' },
  { word: '花屋', category: '職業' },
  { word: '探偵', category: '職業' },
  { word: '忍者', category: '職業' },
  { word: '海賊', category: '職業' },
  { word: 'アナウンサー', category: '職業' },
  { word: 'マジシャン', category: '職業' },
  { word: '画家', category: '職業' },
  { word: 'ピアニスト', category: '職業' },
  { word: '建築家', category: '職業' },
  { word: '美容師', category: '職業' },

  // 乗り物 (20)
  { word: '新幹線', category: '乗り物' },
  { word: '飛行機', category: '乗り物' },
  { word: '自転車', category: '乗り物' },
  { word: 'ヘリコプター', category: '乗り物' },
  { word: '潜水艦', category: '乗り物' },
  { word: 'ロケット', category: '乗り物' },
  { word: '気球', category: '乗り物' },
  { word: 'ジェットコースター', category: '乗り物' },
  { word: 'パトカー', category: '乗り物' },
  { word: '救急車', category: '乗り物' },
  { word: 'バス', category: '乗り物' },
  { word: 'タクシー', category: '乗り物' },
  { word: 'フェリー', category: '乗り物' },
  { word: 'モノレール', category: '乗り物' },
  { word: 'トラック', category: '乗り物' },
  { word: 'バイク', category: '乗り物' },
  { word: 'カヌー', category: '乗り物' },
  { word: '馬車', category: '乗り物' },
  { word: 'ゴンドラ', category: '乗り物' },
  { word: 'スケートボード', category: '乗り物' },

  // 自然 (20)
  { word: '虹', category: '自然' },
  { word: '火山', category: '自然' },
  { word: 'オーロラ', category: '自然' },
  { word: '滝', category: '自然' },
  { word: '流れ星', category: '自然' },
  { word: '月', category: '自然' },
  { word: '太陽', category: '自然' },
  { word: '雷', category: '自然' },
  { word: 'サンゴ礁', category: '自然' },
  { word: '氷河', category: '自然' },
  { word: '森', category: '自然' },
  { word: '川', category: '自然' },
  { word: '山', category: '自然' },
  { word: '星', category: '自然' },
  { word: 'ダイヤモンド', category: '自然' },
  { word: '化石', category: '自然' },
  { word: '地震', category: '自然' },
  { word: '朝焼け', category: '自然' },
  { word: '竜巻', category: '自然' },
  { word: '霧', category: '自然' },
];

/**
 * Fisher-Yates シャッフルで配列をランダムに並び替える（非破壊）。
 */
const shuffle = <T>(arr: readonly T[]): T[] => {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

/**
 * セッション単位でお題を管理する TopicProvider。
 * 使用済みお題を追跡し、重複しないよう配布する。
 */
export interface TopicProvider {
  /** 次のお題を取得する。全て使い切った場合は再シャッフルしてリセット。 */
  readonly next: () => string;
  /** 残りのお題数を返す */
  readonly remaining: () => number;
}

export const createTopicProvider = (): TopicProvider => {
  let queue: string[] = shuffle(TOPICS.map((t) => t.word));
  let usedWords: Set<string> = new Set();

  const next = (): string => {
    if (queue.length === 0) {
      // 全て使い切ったら再シャッフル
      queue = shuffle(TOPICS.map((t) => t.word));
      usedWords = new Set();
    }

    const word = queue.pop()!;
    usedWords = new Set([...usedWords, word]);
    return word;
  };

  const remaining = (): number => queue.length;

  return { next, remaining };
};
