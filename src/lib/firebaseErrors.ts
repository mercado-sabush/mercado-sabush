import { auth } from './firebase';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  friendlyMessage: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function getFriendlyErrorMessage(error: any): string {
  const message = error instanceof Error ? error.message : String(error);
  
  if (message.includes('permission-denied') || message.includes('insufficient permissions')) {
    if (!auth.currentUser) {
      return 'Your session expired. Please sign in again.';
    }
    return 'You do not have permission to perform this action. Please contact support if you believe this is an error.';
  }
  
  if (message.includes('quota-exceeded')) {
    return 'The marketplace is currently very busy. Please try again tomorrow.';
  }

  if (message.includes('network-request-failed')) {
    return 'Network connection lost. Please check your internet and try again.';
  }

  if (message.includes('unavailable')) {
    return 'The connection to our servers is unstable. Please refresh the page.';
  }

  return 'Something went right, but the application had trouble processing it. Please try again.';
}

export function parseFirestoreError(error: any): string {
  try {
    const info = JSON.parse(error.message) as FirestoreErrorInfo;
    return info.friendlyMessage;
  } catch {
    return getFriendlyErrorMessage(error);
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    friendlyMessage: getFriendlyErrorMessage(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
