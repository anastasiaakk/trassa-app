/**
 * Общие документы: государственные институты (ассоциации РАДОР/АДО) выкладывают шаблоны,
 * подрядчики заполняют и отправляют обратно; ассоциации получают уведомления.
 */

export type AssociationId = "rador" | "ado";

export type SharedDocFile = {
  name: string;
  dataUrl: string;
};

export type AssociationDocument = {
  id: string;
  association: AssociationId;
  title: string;
  description: string;
  /** Текст шаблона / полей для подрядчика */
  templateForContractor: string;
  /** Файл, прикреплённый институтом (опционально) */
  instituteAttachment?: SharedDocFile;
  createdAt: string;
};

export type ContractorDocumentSubmission = {
  id: string;
  documentId: string;
  contractorEmailNorm: string;
  contractorDisplayName: string;
  filledContent: string;
  contractorAttachment?: SharedDocFile;
  submittedAt: string;
  /** Дублируется при отправке — чтобы ответ оставался в учёте после удаления документа институтом */
  association?: AssociationId;
  /** Название документа на момент отправки */
  documentTitleSnapshot?: string;
};

export type DocumentInstituteNotification = {
  id: string;
  association: AssociationId;
  documentId: string;
  submissionId: string;
  contractorLabel: string;
  createdAt: string;
  read: boolean;
};

type Store = {
  documents: AssociationDocument[];
  submissions: ContractorDocumentSubmission[];
  notifications: DocumentInstituteNotification[];
};

export const SHARED_ASSOCIATION_DOCS_STORAGE_KEY = "trassa-association-shared-documents-v1";
const KEY = SHARED_ASSOCIATION_DOCS_STORAGE_KEY;

export const SHARED_DOCS_UPDATED_EVENT = "trassa-shared-docs-updated";

/** Событие для кабинета института: подрядчик отправил ответ (то же окно). */
export const CONTRACTOR_DOCUMENT_AI_NOTIFY_EVENT = "trassa-contractor-document-ai-notify";

export type ContractorDocumentAiNotifyDetail = {
  association: AssociationId;
  documentTitle: string;
  contractorLabel: string;
  submissionId: string;
};

const PENDING_AI_TOAST_KEY = "trassa-pending-doc-ai-toast";

function emptyStore(): Store {
  return { documents: [], submissions: [], notifications: [] };
}

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const data = JSON.parse(raw) as Store;
    if (!data || !Array.isArray(data.documents)) return emptyStore();
    return {
      documents: data.documents,
      submissions: Array.isArray(data.submissions) ? data.submissions : [],
      notifications: Array.isArray(data.notifications) ? data.notifications : [],
    };
  } catch {
    return emptyStore();
  }
}

function writeStore(s: Store) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent(SHARED_DOCS_UPDATED_EVENT));
}

export function listDocuments(association: AssociationId): AssociationDocument[] {
  return readStore().documents.filter((d) => d.association === association).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Все документы обеих ассоциаций — для кабинета подрядчика */
export function listAllDocumentsForContractors(): AssociationDocument[] {
  return readStore().documents.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getDocument(id: string): AssociationDocument | undefined {
  return readStore().documents.find((d) => d.id === id);
}

export function addDocument(
  association: AssociationId,
  payload: Omit<AssociationDocument, "id" | "association" | "createdAt">
): AssociationDocument {
  const store = readStore();
  const doc: AssociationDocument = {
    ...payload,
    id: `doc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    association,
    createdAt: new Date().toISOString(),
  };
  store.documents.push(doc);
  writeStore(store);
  return doc;
}

/** Удаляет только карточку документа института. Ответы подрядчиков и уведомления сохраняются. */
export function removeDocument(id: string): void {
  const store = readStore();
  store.documents = store.documents.filter((d) => d.id !== id);
  writeStore(store);
}

export function listSubmissionsForDocument(documentId: string): ContractorDocumentSubmission[] {
  return readStore()
    .submissions.filter((s) => s.documentId === documentId)
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

/** Подрядчик с данным e-mail уже отправлял ответ по этому документу (один ответ на письмо). */
export function contractorHasSubmittedDocument(documentId: string, contractorEmailNorm: string): boolean {
  const e = contractorEmailNorm.trim().toLowerCase();
  if (!e) return false;
  return readStore().submissions.some((s) => s.documentId === documentId && s.contractorEmailNorm === e);
}

export function submitContractorDocument(input: {
  documentId: string;
  contractorEmailNorm: string;
  contractorDisplayName: string;
  filledContent: string;
  contractorAttachment?: SharedDocFile;
}): { ok: true; submission: ContractorDocumentSubmission } | { ok: false; error: string } {
  const store = readStore();
  const doc = store.documents.find((d) => d.id === input.documentId);
  if (!doc) return { ok: false, error: "Документ не найден." };
  if (!input.filledContent.trim()) return { ok: false, error: "Заполните ответ перед отправкой." };
  if (contractorHasSubmittedDocument(input.documentId, input.contractorEmailNorm)) {
    return {
      ok: false,
      error:
        "Вы уже отправляли заполненный документ по этому письму. Повторная отправка не требуется.",
    };
  }

  const submission: ContractorDocumentSubmission = {
    id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    documentId: input.documentId,
    contractorEmailNorm: input.contractorEmailNorm,
    contractorDisplayName: input.contractorDisplayName,
    filledContent: input.filledContent.trim(),
    contractorAttachment: input.contractorAttachment,
    submittedAt: new Date().toISOString(),
    association: doc.association,
    documentTitleSnapshot: doc.title,
  };
  store.submissions.push(submission);

  const note: DocumentInstituteNotification = {
    id: `n-${submission.id}`,
    association: doc.association,
    documentId: doc.id,
    submissionId: submission.id,
    contractorLabel: input.contractorDisplayName || input.contractorEmailNorm,
    createdAt: submission.submittedAt,
    read: false,
  };
  store.notifications.push(note);
  writeStore(store);

  const contractorLabel = input.contractorDisplayName || input.contractorEmailNorm;
  try {
    sessionStorage.setItem(
      PENDING_AI_TOAST_KEY,
      JSON.stringify({
        association: doc.association,
        documentTitle: doc.title,
        contractorLabel,
        at: Date.now(),
      })
    );
  } catch {
    /* ignore */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(CONTRACTOR_DOCUMENT_AI_NOTIFY_EVENT, {
        detail: {
          association: doc.association,
          documentTitle: doc.title,
          contractorLabel,
          submissionId: submission.id,
        } satisfies ContractorDocumentAiNotifyDetail,
      })
    );
  }

  return { ok: true, submission };
}

export function listNotifications(association: AssociationId): DocumentInstituteNotification[] {
  return readStore()
    .notifications.filter((n) => n.association === association)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function unreadNotificationCount(association: AssociationId): number {
  return listNotifications(association).filter((n) => !n.read).length;
}

export function markNotificationRead(id: string): void {
  const store = readStore();
  const n = store.notifications.find((x) => x.id === id);
  if (n) n.read = true;
  writeStore(store);
}

export function markAllNotificationsRead(association: AssociationId): void {
  const store = readStore();
  store.notifications.forEach((n) => {
    if (n.association === association) n.read = true;
  });
  writeStore(store);
}

export function getSubmission(id: string): ContractorDocumentSubmission | undefined {
  return readStore().submissions.find((s) => s.id === id);
}

/** Все ответы подрядчиков по документам данной ассоциации (для плашки «Входящие документы»). */
export type IncomingDocumentItem = {
  submission: ContractorDocumentSubmission;
  document: AssociationDocument;
  /** Связанное уведомление (прочитано / не прочитано); может отсутствовать у старых данных */
  notification: DocumentInstituteNotification | undefined;
};

function submissionAssociation(
  store: Store,
  s: ContractorDocumentSubmission,
  docById: Map<string, AssociationDocument>
): AssociationId | undefined {
  if (s.association) return s.association;
  const d = docById.get(s.documentId);
  if (d) return d.association;
  return store.notifications.find((n) => n.submissionId === s.id)?.association;
}

function placeholderDocumentForOrphanSubmission(
  submission: ContractorDocumentSubmission,
  association: AssociationId
): AssociationDocument {
  const title =
    submission.documentTitleSnapshot ?? "Документ снят с публикации";
  return {
    id: submission.documentId,
    association,
    title,
    description: "Карточка удалена институтом; ответ подрядчика сохранён ниже во входящих.",
    templateForContractor: "",
    createdAt: submission.submittedAt,
  };
}

export function listIncomingDocumentsForAssociation(association: AssociationId): IncomingDocumentItem[] {
  const store = readStore();
  const docById = new Map(store.documents.map((d) => [d.id, d]));
  return store.submissions
    .filter((s) => submissionAssociation(store, s, docById) === association)
    .map((submission) => {
      const existing = docById.get(submission.documentId);
      const document =
        existing ?? placeholderDocumentForOrphanSubmission(submission, association);
      const notification = store.notifications.find((n) => n.submissionId === submission.id);
      return { submission, document, notification };
    })
    .sort((a, b) => b.submission.submittedAt.localeCompare(a.submission.submittedAt));
}

export function markNotificationReadForSubmissionId(submissionId: string): void {
  const store = readStore();
  const n = store.notifications.find((x) => x.submissionId === submissionId);
  if (n) {
    n.read = true;
    writeStore(store);
  }
}
