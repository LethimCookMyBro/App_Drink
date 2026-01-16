// Thai Drinking Game Questions Database
// Categories: chill, mid, spicy (18+)

export interface Question {
  id: string;
  text: string;
  type: "question" | "truth" | "dare" | "chaos" | "vote";
  level: 1 | 2 | 3; // 1=chill, 2=mid, 3=spicy
  is18Plus: boolean;
}

// ===============================
// Level 1 - Chill (ชิลล์ๆ)
// เบาๆ ขำๆ วอร์มวง
// ===============================
export const chillQuestions: Question[] = [
  {
    id: "c1",
    text: "เคยโกหกแม่เรื่องอะไรบ้าง?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c2",
    text: "อาหารที่แอบกินคนเดียวไม่ยอมแบ่งใครคืออะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c3",
    text: "ถ้าได้ย้อนเวลากลับไปแก้ไขอะไรได้ 1 อย่าง จะแก้อะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c4",
    text: "เพลงอะไรที่ชอบร้องตอนอาบน้ำ?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c5",
    text: "นิสัยแย่ๆ ที่ไม่ยอมแก้คืออะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c6",
    text: "ของที่ซื้อแล้วเสียดายเงินที่สุดคืออะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c7",
    text: "ถ้าโดนหวยรางวัลที่ 1 อย่างแรกที่จะทำคืออะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c8",
    text: "เรื่องโง่ๆ ที่ทำตอนเด็กคืออะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c9",
    text: "ฝันร้ายที่จำได้ชัดที่สุดคืออะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c10",
    text: "ถ้าเลือกได้ อยากมีซูเปอร์พาวเวอร์อะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c11",
    text: "อะไรที่กลัวแต่ไม่กล้าบอกใคร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c12",
    text: "หนังเรื่องไหนที่ร้องไห้หนักมาก?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c13",
    text: "ถ้าต้องกินอาหารอย่างเดียวตลอดชีวิต เลือกอะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c14",
    text: "เคยโดดงาน/โดดเรียนไปทำอะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c15",
    text: "สิ่งที่คนอื่นทำแล้วหงุดหงิดที่สุดคืออะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c16",
    text: "ชื่อเล่นสมัยเด็กคืออะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c17",
    text: "เคยแกล้งป่วยหนีเรียน/งานบ้างไหม?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c18",
    text: "สัตว์อะไรที่กลัวมากที่สุด?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c19",
    text: "ถ้าเป็นคนดังได้ 1 วัน อยากเป็นใคร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c20",
    text: "Guilty pleasure ที่ไม่บอกใครคืออะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c21",
    text: "เพลงที่ฟังแล้วอยากร้องไห้คือเพลงอะไร?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
  {
    id: "c22",
    text: "ถ้าต้องย้ายไปอยู่ต่างประเทศ เลือกที่ไหน?",
    type: "question",
    level: 1,
    is18Plus: false,
  },
];

// ===============================
// Level 2 - Mid (เริ่มเดือด)
// เริ่มจริง เริ่มเปิดใจ
// ===============================
export const midQuestions: Question[] = [
  {
    id: "m1",
    text: "เรื่องที่ไม่เคยบอกใครในวงนี้?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m2",
    text: "เคยแอบชอบเพื่อนในกลุ่มไหม?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m3",
    text: "ความลับที่รู้แล้วจะอึ้งคนในวง?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m4",
    text: "คนในวงที่เคยนินทาลับหลังคือใคร?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m5",
    text: "เคยโกหกเรื่องใหญ่ๆ แล้วยังไม่ถูกจับได้?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m6",
    text: "เรื่องที่ทำให้อายที่สุดในชีวิตคืออะไร?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m7",
    text: "เคยแอบดูมือถือคนอื่นไหม?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m8",
    text: "คนในวงที่เชื่อใจน้อยที่สุดคือใคร?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m9",
    text: "เคยโกหกแฟนเรื่องอะไรที่หนักสุด?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m10",
    text: "ถ้าต้องเลือกคนในวงไปติดเกาะด้วย เลือกใคร?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m11",
    text: "เรื่องที่เสียใจที่สุดที่เคยทำกับเพื่อน?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m12",
    text: "ถ้าต้องตัดเพื่อนออกไป 1 คน เลือกใคร?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m13",
    text: "เคยขโมยอะไรมาบ้าง? (แม้แต่เล็กน้อย)",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m14",
    text: "ความสัมพันธ์ที่ล้มเหลวที่สุดคืออะไร?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m15",
    text: "เคยแอบรักใครที่รักไม่ได้บ้างไหม?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m16",
    text: "คนแรกที่จะโทรหาถ้ามีปัญหาคือใคร?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m17",
    text: "เคยทำอะไรแย่ๆ กับคนที่รักแล้วเสียใจ?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m18",
    text: "ความลับเรื่องเงินที่ไม่เคยบอกใคร?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m19",
    text: "เคยได้ยินเพื่อนนินทาแล้วแกล้งไม่รู้ไหม?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m20",
    text: "ใครในวงที่คิดว่าจะประสบความสำเร็จที่สุด?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m21",
    text: "เรื่องที่ไม่อยากให้พ่อแม่รู้คืออะไร?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
  {
    id: "m22",
    text: "คนในวงที่อยากให้เป็นพี่/น้องจริงๆ คือใคร?",
    type: "question",
    level: 2,
    is18Plus: false,
  },
];

// ===============================
// Level 3 - Spicy 18+ (แตกแน่)
// แรงแบบผู้ใหญ่ แต่ไม่บรรยายเชิงเพศ
// ===============================
export const spicyQuestions: Question[] = [
  {
    id: "s1",
    text: "เคยทำอะไรแย่ๆ แล้วไม่เคยสารภาพ?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s2",
    text: "คนในวงที่คุณจะเลือกถ้าต้องติดเกาะด้วยกันคือใคร?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s3",
    text: "เรื่องที่ไม่อยากให้แฟนรู้ที่สุดคืออะไร?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s4",
    text: "เคยนอกใจใครบ้างไหม? (ไม่ต้องบอกชื่อ)",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s5",
    text: "ถ้าต้องเลือกจีบคนในวงได้ 1 คน เลือกใคร?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s6",
    text: "อะไรที่ทำตอนเมาแล้วอายมากที่สุด?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s7",
    text: "เคยแอบส่องโซเชียลแฟนเก่าบ่อยแค่ไหน?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s8",
    text: "ความสัมพันธ์ที่ซับซ้อนที่สุดที่เคยมีคืออะไร?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s9",
    text: "เคยเอาเรื่องของเพื่อนไปบอกคนอื่นบ้างไหม?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s10",
    text: "ถ้าต้องเลือกคนในวงมาเป็นเพื่อนตลอดชีวิต 1 คน?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s11",
    text: "เคยทำอะไรที่ผิดกฎหมายบ้างไหม?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s12",
    text: "ใครคือแฟนเก่าที่ยังไม่ลืม?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s13",
    text: "เรื่องที่ทำตอนเมาแล้วยังจำได้ขำๆ คืออะไร?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s14",
    text: "เคยโกหกแฟนว่าไปไหน แต่จริงๆ ไปที่อื่น?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s15",
    text: "ถ้าแฟนมาถามว่ามีใครอื่นไหม จะตอบว่าอะไร?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s16",
    text: "เคยมีความสัมพันธ์ที่พ่อแม่ไม่รู้บ้างไหม?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s17",
    text: "อะไรที่ทำให้หมดรักคนๆ นึงได้เลย?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s18",
    text: "red flag ที่ใหญ่ที่สุดของตัวเองคืออะไร?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s19",
    text: "เคยบล็อคคนที่รู้จักในกลุ่มนี้ไหม?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s20",
    text: "คนในวงที่คิดว่าจะเลิกกับแฟนเร็วสุดคือใคร?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s21",
    text: "เคยกลับไปหาแฟนเก่าตอนเมาบ้างไหม?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
  {
    id: "s22",
    text: "ความลับที่ถ้าบอกแฟนจะโดนเลิกทันทีคืออะไร?",
    type: "question",
    level: 3,
    is18Plus: true,
  },
];

// ===============================
// Dares (คำท้าทาย)
// ===============================
export const dares: Question[] = [
  {
    id: "d1",
    text: "โทรหาแฟนเก่าแล้วบอกว่าคิดถึงหมาของเขา",
    type: "dare",
    level: 2,
    is18Plus: false,
  },
  {
    id: "d2",
    text: "ทักแชทหาคนที่ไม่ได้คุยมา 1 ปี ด้วยสติกเกอร์แปลกๆ",
    type: "dare",
    level: 1,
    is18Plus: false,
  },
  {
    id: "d3",
    text: "โพสต์ IG Story ร้องเพลงสักท่อน",
    type: "dare",
    level: 2,
    is18Plus: false,
  },
  {
    id: "d4",
    text: "ให้คนในวงเลือกผู้ติดตามใน IG แล้วกดไลค์รูปเก่าสุด",
    type: "dare",
    level: 2,
    is18Plus: false,
  },
  {
    id: "d5",
    text: "โทรหาพ่อหรือแม่ บอกว่ารักมากๆ",
    type: "dare",
    level: 1,
    is18Plus: false,
  },
  {
    id: "d6",
    text: "ทักแชทหาคนสุ่มใน IG ขอเบอร์โทร",
    type: "dare",
    level: 3,
    is18Plus: true,
  },
  {
    id: "d7",
    text: "ให้ทุกคนในวงอ่านแชทกับคนที่คุยล่าสุด",
    type: "dare",
    level: 3,
    is18Plus: true,
  },
  {
    id: "d8",
    text: "โพสต์รูปเก่าที่อายที่สุดลง story",
    type: "dare",
    level: 2,
    is18Plus: false,
  },
  {
    id: "d9",
    text: "ทักหาเพื่อนที่ไม่สนิท ชวนไปกินข้าว",
    type: "dare",
    level: 1,
    is18Plus: false,
  },
  {
    id: "d10",
    text: "แสดงรูปล่าสุดที่บันทึกไว้ในมือถือ",
    type: "dare",
    level: 2,
    is18Plus: false,
  },
];

// ===============================
// Chaos Mode Rules
// ===============================
export const chaosRules: Question[] = [
  {
    id: "ch1",
    text: "ใครที่ใส่เสื้อสีดำ → ดื่มให้หมดแก้ว!",
    type: "chaos",
    level: 3,
    is18Plus: false,
  },
  {
    id: "ch2",
    text: "คนที่อายุน้อยที่สุด → เลือกคนดื่ม 2 แก้ว",
    type: "chaos",
    level: 2,
    is18Plus: false,
  },
  {
    id: "ch3",
    text: "คนที่ถือมือถือ → ดื่มทันทีแล้ววางมือถือ",
    type: "chaos",
    level: 1,
    is18Plus: false,
  },
  {
    id: "ch4",
    text: "ทุกคนในวง → ดื่มพร้อมกัน 3 วิ!",
    type: "chaos",
    level: 2,
    is18Plus: false,
  },
  {
    id: "ch5",
    text: "คนที่หัวเราะก่อน → โดนจี้ 10 ครั้ง",
    type: "chaos",
    level: 1,
    is18Plus: false,
  },
  {
    id: "ch6",
    text: "คนที่นั่งซ้ายสุด → เล่าเรื่องน่าอายให้ฟัง",
    type: "chaos",
    level: 2,
    is18Plus: false,
  },
  {
    id: "ch7",
    text: "คนที่มาสายวันนี้ → ดื่ม 2 แก้ว",
    type: "chaos",
    level: 1,
    is18Plus: false,
  },
  {
    id: "ch8",
    text: "คนที่เช็คมือถือล่าสุด → วางมือถือไว้กลางโต๊ะ 5 นาที",
    type: "chaos",
    level: 1,
    is18Plus: false,
  },
  {
    id: "ch9",
    text: "คนที่ผมยาวสุด → เลือกคนดื่มด้วย 1 คน",
    type: "chaos",
    level: 1,
    is18Plus: false,
  },
  {
    id: "ch10",
    text: "คนที่หัวเราะเสียงดังสุด → ทำหน้าตลกให้ทุกคนดู",
    type: "chaos",
    level: 1,
    is18Plus: false,
  },
];

// ===============================
// Vote Questions (โหมดโหวต)
// ===============================
export const voteQuestions: Question[] = [
  {
    id: "v1",
    text: "ใครมีเกณฑ์จะเป็นคนรวยที่สุด?",
    type: "vote",
    level: 1,
    is18Plus: false,
  },
  {
    id: "v2",
    text: "ใครเป็นคนจริงใจที่สุดในวง?",
    type: "vote",
    level: 1,
    is18Plus: false,
  },
  {
    id: "v3",
    text: "ใครจะแต่งงานก่อน?",
    type: "vote",
    level: 1,
    is18Plus: false,
  },
  {
    id: "v4",
    text: "ใครเป็นคนปากไม่ตรงใจที่สุด?",
    type: "vote",
    level: 2,
    is18Plus: false,
  },
  {
    id: "v5",
    text: "ใครชอบนินทาที่สุด?",
    type: "vote",
    level: 2,
    is18Plus: false,
  },
  {
    id: "v6",
    text: "ใครมีเกณฑ์โดนแฟนทิ้ง?",
    type: "vote",
    level: 2,
    is18Plus: false,
  },
  {
    id: "v7",
    text: "ใครน่าจะเป็นพ่อที่ดี?",
    type: "vote",
    level: 1,
    is18Plus: false,
  },
  {
    id: "v8",
    text: "ใครจะบ้านแตกก่อน?",
    type: "vote",
    level: 3,
    is18Plus: true,
  },
  {
    id: "v9",
    text: "ใครน่าจะมีแฟนมากที่สุด?",
    type: "vote",
    level: 2,
    is18Plus: true,
  },
  {
    id: "v10",
    text: "ใครจะติดคุกก่อน?",
    type: "vote",
    level: 3,
    is18Plus: true,
  },
];

// ===============================
// All Questions
// ===============================
export const allQuestions: Question[] = [
  ...chillQuestions,
  ...midQuestions,
  ...spicyQuestions,
  ...dares,
  ...chaosRules,
  ...voteQuestions,
];

// Helper functions
export const getQuestionsByLevel = (level: 1 | 2 | 3) =>
  allQuestions.filter((q) => q.level === level);
export const getQuestionsByType = (type: Question["type"]) =>
  allQuestions.filter((q) => q.type === type);
export const getSafeQuestions = () => allQuestions.filter((q) => !q.is18Plus);
export const getRandomQuestion = (
  type?: Question["type"],
  level?: 1 | 2 | 3,
  allow18Plus = false
) => {
  let filtered = allQuestions;
  if (type) filtered = filtered.filter((q) => q.type === type);
  if (level) filtered = filtered.filter((q) => q.level === level);
  if (!allow18Plus) filtered = filtered.filter((q) => !q.is18Plus);
  return filtered[Math.floor(Math.random() * filtered.length)];
};
