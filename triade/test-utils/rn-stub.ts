import React from 'react';

// Headless `react-native` stub for component tests run under `node --test`
// (via tsx). Components under test only use View/Text/Pressable/StyleSheet,
// none of which need the native runtime to render via react-test-renderer.
// Host components are returned as string-typed React elements so the test
// renderer can mount them. Mapped from `react-native` through tsconfig paths.
type Props = { children?: React.ReactNode; [key: string]: any };

export const View = (props: Props) => React.createElement('View', props, props.children);
export const Text = (props: Props) => React.createElement('Text', props, props.children);
export const Pressable = (props: Props) => React.createElement('Pressable', props, props.children);
export const StyleSheet = { create: <T extends Record<string, any>>(s: T) => s };

export default { View, Text, Pressable, StyleSheet };
