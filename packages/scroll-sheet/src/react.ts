/*
 * React adapter: <Sheet> renders the dialog and attaches the core; <SheetTrigger sheet="id">
 * opens it from anywhere, the other parts go inside.
 */
import { createContext, createElement, useContext, useEffect, useId, useRef, useState } from 'react';
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
