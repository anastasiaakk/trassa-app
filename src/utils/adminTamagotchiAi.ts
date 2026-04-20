import { getAssistantReply, type ChatTurn } from "./aiAssistantReply";

/**
 * Ответы «умного» кота: тот же пайплайн, что у Т-бота (VITE_AI_CHAT_URL или локальный режим),
 * с ролевым контекстом питомца.
 */
export async function getTamagotchiCatReply(
  petName: string,
  satiety: number,
  happiness: number,
  history: ChatTurn[]
): Promise<string> {
  const last = history[history.length - 1];
  if (!last || last.role !== "user") return "Мрр? Напишите что-нибудь — я слушаю.";
  const userLine = last.text.trim();
  if (!userLine) return "Мяу? Пустое сообщение.";

  const roleBlock =
    `Ты — виртуальный умный кот-питомец по имени «${petName}» в личном кабинете администратора портала ТрассА. ` +
    `Сытость ${Math.round(satiety)}/100, радость ${Math.round(happiness)}/100. ` +
    `Говори по-русски, кратко (1–5 предложений), дружелюбно и остроумно; можешь легонько мяукать или шутить, но оставайся полезным. ` +
    `Если спрашивают про админку — подсказывай про пользователей, техработы, список организаций подрядчиков. ` +
    `Сообщение человека:\n${userLine}`;

  const augmented: ChatTurn[] = [...history.slice(0, -1), { role: "user", text: roleBlock }];
  return getAssistantReply(augmented);
}
