/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { Message } from './types';

export enum StreamingChatResponseEventType {
  ChatCompletionChunk = 'chatCompletionChunk',
  ConversationCreate = 'conversationCreate',
  ConversationUpdate = 'conversationUpdate',
  MessageAdd = 'messageAdd',
  ChatCompletionError = 'chatCompletionError',
}

type StreamingChatResponseEventBase<
  TEventType extends StreamingChatResponseEventType,
  TData extends {}
> = {
  type: TEventType;
} & TData;

export type ChatCompletionChunkEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ChatCompletionChunk,
  {
    id: string;
    message: {
      content?: string;
      function_call?: {
        name?: string;
        arguments?: string;
      };
    };
  }
>;

export type ConversationCreateEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ConversationCreate,
  {
    conversation: {
      id: string;
      title: string;
      last_updated: string;
    };
  }
>;

export type ConversationUpdateEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ConversationUpdate,
  {
    conversation: {
      id: string;
      title: string;
      last_updated: string;
    };
  }
>;

export type MessageAddEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.MessageAdd,
  { message: Message; id: string }
>;

export type ChatCompletionErrorEvent = StreamingChatResponseEventBase<
  StreamingChatResponseEventType.ChatCompletionError,
  {
    error: {
      message: string;
      stack?: string;
      code?: ChatCompletionErrorCode;
      meta?: Record<string, any>;
    };
  }
>;

export type StreamingChatResponseEvent =
  | ChatCompletionChunkEvent
  | ConversationCreateEvent
  | ConversationUpdateEvent
  | MessageAddEvent
  | ChatCompletionErrorEvent;

export type StreamingChatResponseEventWithoutError = Exclude<
  StreamingChatResponseEvent,
  ChatCompletionErrorEvent
>;

export enum ChatCompletionErrorCode {
  InternalError = 'internalError',
  NotFoundError = 'notFoundError',
  TokenLimitReachedError = 'tokenLimitReachedError',
}

interface ErrorMetaAttributes {
  [ChatCompletionErrorCode.InternalError]: {};
  [ChatCompletionErrorCode.NotFoundError]: {};
  [ChatCompletionErrorCode.TokenLimitReachedError]: {
    tokenLimit?: number;
    tokenCount?: number;
  };
}

export class ChatCompletionError<T extends ChatCompletionErrorCode> extends Error {
  constructor(public code: T, message: string, public meta?: ErrorMetaAttributes[T]) {
    super(message);
  }
}

export function createTokenLimitReachedError(tokenLimit?: number, tokenCount?: number) {
  return new ChatCompletionError(
    ChatCompletionErrorCode.TokenLimitReachedError,
    i18n.translate('xpack.observabilityAiAssistant.chatCompletionError.tokenLimitReachedError', {
      defaultMessage: `Token limit reached. Token limit is {tokenLimit}, but the current conversation has {tokenCount} tokens.`,
      values: { tokenLimit, tokenCount },
    }),
    { tokenLimit, tokenCount }
  );
}

export function createConversationNotFoundError() {
  return new ChatCompletionError(
    ChatCompletionErrorCode.NotFoundError,
    i18n.translate('xpack.observabilityAiAssistant.chatCompletionError.conversationNotFoundError', {
      defaultMessage: 'Conversation not found',
    })
  );
}

export function createInternalServerError(originalErrorMessage: string) {
  return new ChatCompletionError(ChatCompletionErrorCode.InternalError, originalErrorMessage);
}

export function isTokenLimitReachedError(
  error: Error
): error is ChatCompletionError<ChatCompletionErrorCode.TokenLimitReachedError> {
  return (
    error instanceof ChatCompletionError &&
    error.code === ChatCompletionErrorCode.TokenLimitReachedError
  );
}

export function isChatCompletionError(error: Error): error is ChatCompletionError<any> {
  return error instanceof ChatCompletionError;
}
