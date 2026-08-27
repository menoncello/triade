import React from 'react';

// Headless `react-native` stub for component tests run under `node --test`
// (via tsx). Components under test only use View/Text/Pressable/StyleSheet,
// none of which need the native runtime to render via react-test-renderer.
// Host components are returned as string-typed React elements so the test
// renderer can mount them. Mapped from `react-native` through tsconfig paths.
// This stub also provides the minimal RN surface needed for `npx tsc --noEmit
// -p tsconfig.test.json` to pass without the real RN types (fix for
// deferred-work.md 2026-08-24 TS5101 + 3 stub-typing errors).
type Props = { children?: React.ReactNode; [key: string]: any };

export const View = (props: Props) => React.createElement('View', props, props.children);
export const Text = (props: Props) => React.createElement('Text', props, props.children);
export const Pressable = (props: Props) => React.createElement('Pressable', props, props.children);
export const StyleSheet = {
  create: <T extends Record<string, any>>(s: T) => s,
  flatten: (style: any) => style,
  hairlineWidth: 1,
};

export const Animated = {
  View: (props: Props) => React.createElement('Animated.View', props, props.children),
  Text: (props: Props) => React.createElement('Animated.Text', props, props.children),
  Value: class AnimatedValue {
    _value: number;
    constructor(v: number) {
      this._value = v;
    }
    setValue(v: number) {
      this._value = v;
    }
    stopAnimation(cb?: () => void) {
      cb?.();
    }
    interpolate() {
      return this._value;
    }
  },
  timing: (value: any, config: any) => ({
    start: (cb?: (r: { finished: boolean }) => void) => {
      if (value && typeof value.setValue === 'function' && config && 'toValue' in config) {
        value.setValue(config.toValue);
      }
      cb?.({ finished: true });
    },
    stop: () => {},
  }),
  parallel: (anims: any[]) => ({
    start: (cb?: (r: { finished: boolean }) => void) => {
      anims.forEach((a) => a?.start?.());
      cb?.({ finished: true });
    },
    stop: () => {
      anims.forEach((a) => a?.stop?.());
    },
  }),
  spring: (value: any, config: any) => ({
    start: (cb?: (r: { finished: boolean }) => void) => {
      if (value && typeof value.setValue === 'function' && config && 'toValue' in config) {
        value.setValue(config.toValue);
      }
      cb?.({ finished: true });
    },
    stop: () => {},
  }),
};

export const Easing = {
  linear: (t: number) => t,
  cubic: (t: number) => t * t * t,
  quad: (t: number) => t * t,
  out: (fn: (t: number) => number) => fn,
  in: (fn: (t: number) => number) => fn,
  inOut: (fn: (t: number) => number) => fn,
  bezier: (..._args: any[]) => (t: number) => t,
};

// --- Minimal RN hooks / APIs used by App.tsx / GameBoard.tsx ---
export const useWindowDimensions = () => ({ width: 390, height: 844, scale: 2, fontScale: 1 });
export const useColorScheme = () => 'light' as const;
export const Platform = {
  OS: 'ios' as const,
  select: <T,>(obj: { ios?: T; android?: T; default?: T } & Record<string, T>) => obj.ios ?? obj.default ?? (Object.values(obj)[0] as T),
  Version: 0,
};
export const Dimensions = {
  get: (_dim: string) => ({ width: 390, height: 844, scale: 2, fontScale: 1 }),
  addEventListener: () => ({ remove: () => {} }),
  removeEventListener: () => {},
};
export const StatusBar = () => null;

// --- Type-level shims so `react-native-gesture-handler` + RN component props ---
// resolve under the stub's path mapping (ViewStyle etc. are imported by RNGH
// types via `react-native`). Keeping them as `any` preserves host-testable
// permissiveness while satisfying `tsc --noEmit -p tsconfig.test.json`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ViewStyle = any;
export type TextStyle = any;
export type ImageStyle = any;
export type ViewProps = any;
export type TextProps = any;
export type PressableProps = any;
export type StyleProp<T> = T | T[] | null | undefined | false;
export type GestureHandlerRootViewProps = any;

export default { View, Text, Pressable, StyleSheet, useWindowDimensions, Platform, Dimensions };
