/*
 * Preact adapter, the same API as the React one.
 */
import { createContext, createElement } from 'preact';
import { useContext, useEffect, useId, useRef, useState } from 'preact/hooks';
import { createAdapter, type Framework } from './adapter.ts';

export type { OpenChangeDetails, PartProps, SheetProps } from './adapter.ts';
export type { CloseReason, Sheet as SheetApi, SheetState } from './index.ts';

export const {
  Sheet,
  useSheet,
  SheetTrigger,
  SheetClose,
  SheetTitle,
  SheetHandle,
  SheetHeader,
  SheetBody,
  SheetFooter,
} = createAdapter({
  createElement,
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
  useId,
} as unknown as Framework);
