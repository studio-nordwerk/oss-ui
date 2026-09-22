/*
 * Shared implementation of the React and Preact adapters, written against the few hook and
 * element functions both libraries have. Adapters render markup and attach the core; they
 * contain no carousel behaviour of their own.
 */
import { attach, type Carousel, type CarouselOptions, type CarouselState, type Plugin } from './index.ts';
import { PRE_POSITION, baseVars, responsiveCss, type LayoutProps } from './markup.ts';

export interface CarouselProps extends LayoutProps {
  /** Accessible name of the scrolling list. */
  label: string;
  /** Element of the track. With 'ul' every child is wrapped in <li>, otherwise in <div>. */
  as?: 'ul' | 'div';
  children?: unknown;
  className?: string;
  style?: Record<string, string | number>;
  slideClassName?: string;
  /** Mark slides as groups with aria-roledescription="slide" and "n of count" labels. */
  slideRoles?: boolean;
  /** Keep a short row in the middle instead of at the start. */
  centerFew?: boolean;
  /** Default arrows. false renders none, e.g. when the host brings its own. */
  arrows?: boolean;
  /** Default dots. */
  dots?: boolean;
  /** Render a play/pause button for the autoplay plugin. */
  playButton?: boolean;
  labels?: CarouselOptions['labels'] & { prev?: string; next?: string };
  initial?: number;
  rewind?: CarouselOptions['rewind'];
  group?: LayoutProps['group'];
  plugins?: Plugin[];
  onChange?: (state: CarouselState) => void;
  /** Receives the carousel after attaching, and null after it is destroyed. */
  carouselRef?: (carousel: Carousel | null) => void;
}

export interface Framework {
  createElement: (...args: any[]) => any;
  Fragment: any;
  useState: <T>(initial: T) => [T, (value: T) => void];
  useRef: <T>(initial: T) => { current: T };
  useEffect: (effect: () => void | (() => void), deps?: unknown[]) => void;
  useLayoutEffect: (effect: () => void | (() => void), deps?: unknown[]) => void;
  useId: () => string;
  toChildArray: (children: unknown) => any[];
}

const chevron = (h: Framework['createElement'], path: string) =>
  h('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' }, h('path', { d: path }));

export function createAdapter(framework: Framework) {
  const { createElement: h, Fragment, useState, useRef, useEffect, useLayoutEffect, useId, toChildArray } = framework;
  const useBeforePaint = typeof window == 'undefined' ? useEffect : useLayoutEffect;

  /**
   * Attach a carousel to your own markup. Put `ref` on the root. Options are read once, when
   * the root mounts; give the component a new `key` to attach again with other options.
   */
  function useCarousel(options: CarouselOptions = {}) {
    const ref = useRef<HTMLElement | null>(null);
    // The latest options for the callbacks, updated after render and before the attach below.
    const latest = useRef(options);
    useBeforePaint(() => {
      // oxlint-disable-next-line react/immutability -- a ref from the framework's useRef, which the rule cannot see
      latest.current = options;
    });
    const [carousel, setCarousel] = useState<Carousel | null>(null);
    const [state, setState] = useState<CarouselState | null>(null);
    useBeforePaint(() => {
      if (!ref.current) return;
      const instance = attach(ref.current, {
        ...latest.current,
        onChange: (next) => {
          setState(next);
          latest.current.onChange?.(next);
        },
      });
      setCarousel(instance);
      setState(instance.state);
      return () => {
        instance.destroy();
        setCarousel(null);
      };
    }, []);
    return { ref, carousel, state };
  }

  function Carousel(props: CarouselProps) {
    const id = useId();
    const { as = 'div', label, children, className, style, slideClassName, slideRoles, centerFew } = props;
    const { arrows = true, dots = true, playButton, labels = {}, initial = 0, carouselRef } = props;
    const { ref, carousel } = useCarousel({
      group: typeof props.group == 'object' ? undefined : props.group,
      initial,
      rewind: props.rewind,
      labels,
      plugins: props.plugins,
      onChange: props.onChange,
    });
    const handoff = useRef(carouselRef);
    useEffect(() => {
      // oxlint-disable-next-line react/immutability -- a ref from the framework's useRef, which the rule cannot see
      handoff.current = carouselRef;
    });
    useEffect(() => {
      if (!carousel) return;
      handoff.current?.(carousel);
      return () => handoff.current?.(null);
    }, [carousel]);

    const slides = toChildArray(children);
    const item = as == 'ul' ? 'li' : 'div';
    const css = responsiveCss(id, props);
    const root = h(
      'div',
      {
        ref,
        className: ['sc', centerFew && 'sc--center-few', className].filter(Boolean).join(' '),
        'data-sc-id': id,
        style: { ...baseVars(props), ...style },
      },
      // Raw, not as a text child: renderers may escape text inside <style>, which breaks the selectors.
      css && h('style', { dangerouslySetInnerHTML: { __html: css } }),
      h(
        as,
        { className: 'sc-track', 'data-sc-track': '', tabIndex: 0, 'aria-label': label },
        slides.map((child, i) =>
          h(
            item,
            {
              key: child?.key ?? i,
              className: slideClassName,
              'data-sc-initial': i == initial && i > 0 ? '' : undefined,
              ...(slideRoles && {
                role: 'group',
                'aria-roledescription': 'slide',
                'aria-label': `${i + 1} of ${slides.length}`,
              }),
            },
            child,
          ),
        ),
      ),
      arrows &&
        h(
          Fragment,
          null,
          h(
            'button',
            {
              type: 'button',
              className: 'sc-nav sc-prev',
              'data-sc-prev': '',
              'aria-label': labels.prev || 'Previous',
            },
            chevron(h, 'm15 18-6-6 6-6'),
          ),
          h(
            'button',
            { type: 'button', className: 'sc-nav sc-next', 'data-sc-next': '', 'aria-label': labels.next || 'Next' },
            chevron(h, 'm9 6 6 6-6 6'),
          ),
        ),
      playButton &&
        h(
          'button',
          { type: 'button', className: 'sc-play', 'data-sc-play': '', 'aria-label': 'Stop automatic scrolling' },
          h(
            'svg',
            { className: 'sc-icon-play', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
            h('path', { d: 'M8 5v14l11-7z' }),
          ),
          h(
            'svg',
            { className: 'sc-icon-pause', viewBox: '0 0 24 24', 'aria-hidden': 'true', focusable: 'false' },
            h('path', { d: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z' }),
          ),
        ),
      dots && h('div', { className: 'sc-dots', 'data-sc-dots': '' }),
      h('p', { className: 'sc-status', 'data-sc-status': '', 'aria-live': 'polite' }),
    );
    // The inline script sets the start position before the first paint of server markup.
    return initial > 0
      ? h(Fragment, null, root, h('script', { dangerouslySetInnerHTML: { __html: PRE_POSITION } }))
      : root;
  }

  return { Carousel, useCarousel };
}
