export interface EmojiGroup {
  name: string;
  chars: string;
}

export const EMOJI_GROUPS: EmojiGroup[] = [
  { name: 'Smileys & people', chars: '\u{1F60F}\u{1F60A}\u{1F60D}\u{1F618}\u{1F617}\u{1F61C}\u{1F60B}\u{1F92D}\u{1F92B}\u{1F914}\u{1F644}\u{1F62C}\u{1F605}\u{1F602}\u{1F923}\u{1F979}\u{1F97A}\u{1F633}\u{1F631}\u{1F975}\u{1F976}\u{1F60C}\u{1F634}\u{1F929}\u{1F608}\u{1F47D}\u{1F921}\u{1F480}\u{1F47B}\u{1F638}\u{1F63B}\u{1F63C}\u{1F64C}\u{1F44F}\u{1F44D}\u{1F91D}\u{1F91E}\u{1F44C}\u{1F919}\u{1F44B}\u{1F485}\u{1F483}\u{1F46F}\u{1F46B}\u{1F48F}\u{1F491}\u{1F46D}\u{1F46C}' },
  { name: 'Hearts & symbols', chars: '❤\u{FE0F}\u{1F9E1}\u{1F49B}\u{1F49A}\u{1F499}\u{1F49C}\u{1F5A4}\u{1F90D}\u{1F90E}\u{1F494}\u{1F495}\u{1F496}\u{1F497}\u{1F498}\u{1F49D}\u{1F49F}\u{1F48B}\u{1F4A6}\u{1F4AB}✨\u{1F525}⚡\u{FE0F}\u{1F4A5}\u{1F4A2}\u{1F4AF}❗❓\u{1F51E}\u{1F52F}\u{1F3B5}\u{1F3B6}\u{1F514}\u{1F4A8}\u{1F4AD}' },
  { name: 'Places & travel', chars: '\u{1F30D}\u{1F30E}\u{1F30F}✈\u{FE0F}\u{1F6EB}\u{1F6A2}⛵\u{1F6A4}\u{1F686}\u{1F68C}\u{1F695}\u{1F3E8}\u{1F3E9}⛱\u{FE0F}\u{1F305}\u{1F307}\u{1F303}\u{1F309}⛺\u{1F3AA}\u{1F6D6}\u{1F6C0}\u{1F6BF}\u{1F5FF}\u{1F320}\u{1F319}☀\u{FE0F}⛅\u{1F30A}' },
  { name: 'Food & drink', chars: '\u{1F942}\u{1F37E}\u{1F377}\u{1F378}\u{1F379}\u{1F37B}\u{1F376}\u{1F943}\u{1F964}☕\u{1F375}\u{1F9CA}\u{1F347}\u{1F352}\u{1F353}\u{1F351}\u{1F34C}\u{1F34D}\u{1F345}\u{1F336}\u{FE0F}\u{1F955}\u{1F32E}\u{1F355}\u{1F35D}\u{1F363}\u{1F36B}\u{1F36C}\u{1F370}\u{1F382}\u{1F36F}' },
  { name: 'Objects & activity', chars: '\u{1F389}\u{1F38A}\u{1F381}\u{1F380}\u{1F3AF}\u{1F3B2}\u{1F0CF}\u{1F3AD}\u{1F3A8}\u{1F3AC}\u{1F3A4}\u{1F3B8}\u{1F941}\u{1F4F8}\u{1F4F1}⌛⏰\u{1F513}\u{1F512}\u{1F511}\u{1F6CC}\u{1F457}\u{1F459}\u{1F460}\u{1F452}\u{1F484}\u{1F48D}\u{1F3C6}\u{1F947}\u{1F6A9}\u{1F4DD}' },
];

export function splitEmoji(chars: string): string[] {
  return Array.from(chars.match(/\p{Extended_Pictographic}️?/gu) || []);
}
