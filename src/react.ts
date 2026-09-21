/*
 * React adapter: <Carousel> renders the markup and attaches the core; useCarousel attaches the
 * core to markup you render yourself, for your own arrows and dots.
 */
import { Children, Fragment, createElement, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
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
  toChildArray: Children.toArray,
} as unknown as Framework);
