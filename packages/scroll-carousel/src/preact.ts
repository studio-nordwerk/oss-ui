/*
 * Preact adapter, the same API as the React one: <Carousel> and useCarousel.
 */
import { Fragment, createElement, toChildArray } from 'preact';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'preact/hooks';
import { createAdapter, type Framework } from './adapter.ts';

export type { CarouselProps } from './adapter.ts';
export type { Carousel as CarouselApi, CarouselOptions, CarouselState } from './index.ts';

export const { Carousel, useCarousel } = createAdapter({
  createElement,
  Fragment,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useId,
  toChildArray,
} as unknown as Framework);
