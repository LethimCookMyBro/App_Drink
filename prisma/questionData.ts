import type { QuestionType } from "@prisma/client";

export type SeedQuestion = {
  text: string;
  type: QuestionType;
  level: number;
  is18Plus: boolean;
};

export const RETIRED_QUESTION_TEXTS = [
  "โทรหาแฟนเก่าแล้วบอกว่าคิดถึงหมาของเขา",
  "ปลดล็อคมือถือแล้วให้เพื่อนเลือนดู 1 นาที",
] as const;

export const QUESTIONS: SeedQuestion[] = [
  {
    text: "เคยโกหกแม่เรื่องอะไรบ้าง?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "อาหารที่แอบกินคนเดียวไม่ยอมแบ่งใครคืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ถ้าได้ย้อนเวลากลับไปแก้ไขอะไรได้ 1 อย่าง จะแก้อะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เพลงที่ฟังแล้วร้องไห้คือเพลงอะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ความลับที่ไม่เคยบอกใครเลยคืออะไร?",
    type: "TRUTH",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ร้องเพลงที่กำลังฮิตตอนนี้ให้เพื่อนฟัง",
    type: "DARE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "โหวต: ใครในวงดูแล้วจะเป็นพ่อ/แม่ที่ดีที่สุด?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "โหวต: ใครเหมาะจะเป็นนายก?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เคยแอบชอบเพื่อนสนิทคนไหนในกลุ่มบ้าง?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ช่วงไหนที่รู้สึกเหงาที่สุดในชีวิต?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยโกหกแฟนเรื่องอะไรหนักสุด?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ถ้าให้เลือกเพื่อนในวงเป็นแฟน จะเลือกใคร?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },
  {
    text: "โหวต: ใครในวงดื่มเก่งที่สุด?",
    type: "VOTE",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ทุกคนเล่าเรื่องน่าอาย 1 เรื่อง ใครไม่บอกดื่ม 2 แก้ว",
    type: "CHAOS",
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยฝันเปียกถึงใครในวงบ้าง?",
    type: "TRUTH",
    level: 3,
    is18Plus: true,
  },
  {
    text: "ท่าเซ็กส์ที่ชอบที่สุดคือท่าอะไร?",
    type: "QUESTION",
    level: 3,
    is18Plus: true,
  },
  {
    text: "ครั้งล่าสุดที่ช่วยตัวเองคือเมื่อไหร่?",
    type: "TRUTH",
    level: 3,
    is18Plus: true,
  },
  {
    text: "ถ้าต้อง one night stand กับคนในวง จะเลือกใคร?",
    type: "TRUTH",
    level: 3,
    is18Plus: true,
  },
  {
    text: "ถอดเสื้อแล้วเดินไปหาเครื่องดื่มในตู้เย็น",
    type: "DARE",
    level: 3,
    is18Plus: true,
  },
  {
    text: "โหวต: ใครในวงเซ็กซี่ที่สุด?",
    type: "VOTE",
    level: 3,
    is18Plus: true,
  },
  {
    text: "ทุกคนบอก body count ถ้าโกหกต้องดื่ม 3 แก้ว",
    type: "CHAOS",
    level: 3,
    is18Plus: true,
  },
  {
    text: "นิสัยแย่ๆ ที่ไม่อยากให้ใครรู้คืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เบอร์โทรศัพท์คนสุดท้ายที่โทรหาคือใคร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "สิ่งที่ทำให้ร้องไห้ล่าสุดคืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ความสามารถพิเศษที่ไม่ค่อยมีคนรู้คืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "สิ่งที่กลัวที่สุดในชีวิตคืออะไร?",
    type: "TRUTH",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เลียนเสียงสัตว์ที่เพื่อนเลือกให้",
    type: "DARE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "โหวต: ใครในวงที่น่าจะหาแฟนยากที่สุด?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },

  {
    text: "ถ้าต้องสลับชีวิตกับเพื่อนในวง 1 วัน จะเลือกสลับกับใคร เพราะอะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ครั้งล่าสุดที่โกหกว่า 'ใกล้ถึงแล้ว' ตอนนั้นกำลังทำอะไรอยู่?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ของที่ซื้อตามโฆษณาแล้วผิดหวังที่สุดคืออะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ถ้าได้วันหยุด 1 วันที่ไม่ต้องบอกใคร จะเอาไปทำอะไร?",
    type: "QUESTION",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เดาดิ ใครในวงแอบฟังเพลงเศร้าตอนกลับบ้าน?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    text: "เรื่องอะไรที่ห้ามเพื่อนพูดถึงต่อหน้าแฟนเราเด็ดขาด?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    text: "เคยไล่โพสต์คนจำเพาะเดิมๆ จนย้อนไปหลายปีไหม? ใคร?",
    type: "QUESTION",
    level: 2,
    is18Plus: false,
  },
  {
    text: "แบบไหนทำให้เราเขินสุด: โดนจูบยาว โดนกอดแน่น หรือโดนกระซิบข้างหู?",
    type: "QUESTION",
    level: 3,
    is18Plus: true,
  },

  {
    text: "เรื่องไร้สาระที่แอบภูมิใจที่สุดคืออะไร?",
    type: "TRUTH",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เคยแอบดูสตอรี่คนคนเดิมซ้ำๆ จนกลัวโดนจับได้ไหม? ใคร?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ถ้าต้องยกเงินให้เพื่อนในวงคนเดียวทันที จะให้ใคร เท่าไหร่?",
    type: "TRUTH",
    level: 2,
    is18Plus: false,
  },

  {
    text: "พูดแต่ภาษาอังกฤษจนถึงตาถัดไป",
    type: "DARE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เต้นตามที่เพื่อนสั่ง 30 วินาที",
    type: "DARE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เลียนแบบน้ำเสียงกับสีหน้าคนในวงที่เพื่อนเลือก ให้คนอื่นเดาได้ว่าใคร",
    type: "DARE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ชมเพื่อนคนข้างๆ ให้สุดๆ จนเขิน 30 วินาที",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ร้องเพลงที่ตัวเองเกลียดที่สุดด้วยท่าทางสุดฮุก",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ทำหน้านิ่ง 20 วินาที ถ้าใครในวงทำให้หัวเราะได้ ต้องเริ่มนับใหม่",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    text: "พูดว่า 'รักทุกคนในวงนี้' ด้วยน้ำเสียงโรแมนติกที่สุด",
    type: "DARE",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ให้คนที่นั่งขวามือเลือก 1 อย่าง: จุ๊บแก้ม กอดแน่น หรือกระซิบข้างหู",
    type: "DARE",
    level: 3,
    is18Plus: true,
  },

  {
    text: "โหวต: ใครในวงหัวเร็วที่สุด?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "โหวต: ถ้าตั้งวงร้องเพลง ใครต้องเป็นนักร้องนำ?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "โหวต: ใครน่าจะหลับเป็นคนแรกของปาร์ตี้?",
    type: "VOTE",
    level: 1,
    is18Plus: false,
  },
  {
    text: "โหวต: ใครในวงน่าจะโรแมนติกสุดตอนออกเดต?",
    type: "VOTE",
    level: 3,
    is18Plus: true,
  },

  {
    text: "ห้ามพูดคำว่า 'เปล่า' ใครพูดดื่ม 1 แก้ว จนกว่าจะถึงตาใหม่",
    type: "CHAOS",
    level: 1,
    is18Plus: false,
  },
  {
    text: "ทุกคนต้องเรียกคนถัดไปด้วยชื่อเล่นหวานๆ ที่คิดขึ้นสดๆ ใครหัวเราะก่อนดื่ม",
    type: "CHAOS",
    level: 1,
    is18Plus: false,
  },
  {
    text: "เลือกคนในวง 2 คน สบตากัน 30 วินาที ใครขำก่อนดื่ม 1 แก้ว",
    type: "CHAOS",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ต่อจากนี้ทุกประโยคต้องจบด้วยคำว่า 'จ้า' ใครลืมดื่ม 1 แก้ว",
    type: "CHAOS",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ทุกคนเล่าเรื่องเสียมารยาทสุดๆ ที่เคยทำมาให้ฟัง ใครไม่เล่าดื่ม 2 แก้ว",
    type: "CHAOS",
    level: 2,
    is18Plus: false,
  },
  {
    text: "เลือกคน 1 คนเป็น 'ผู้บังคับบัญชา' 5 นาที ทุกคนต้องทำตามยกเว้นเรื่องดื่ม",
    type: "CHAOS",
    level: 2,
    is18Plus: false,
  },
  {
    text: "ทุกคนหลับตา นับ 3 แล้วชี้คนที่คิดว่าเสียที่สุดในวง คนถูกชี้ดื่ม 2 แก้ว",
    type: "CHAOS",
    level: 3,
    is18Plus: true,
  },
  {
    text: "เรื่องไหนที่ยังไม่เคยเล่าให้ครอบครัวฟัง แต่กล้าเล่าให้วงนี้ฟัง?",
    type: "TRUTH",
    level: 3,
    is18Plus: false,
  },
  {
    text: "โหวต: ถ้าต้องจูบคนในวง 1 คนตอนนี้ จะเลือกใคร?",
    type: "VOTE",
    level: 2,
    is18Plus: true,
  },
];
