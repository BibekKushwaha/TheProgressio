"use client";

import React from 'react';

export type TabsProps = React.ComponentProps<'div'> & { value?: string; onValueChange?: (v: string) => void };

export function Tabs(props: TabsProps) {
  const { children, value, onValueChange, ...rest } = props;
  void value;
  void onValueChange;
  return <div {...rest}>{children}</div>;
}

export function TabsList(props: React.ComponentProps<'div'>) {
  return <div {...props} />;
}

export function TabsTrigger({ children, onClick, ...rest }: React.ComponentProps<'button'> & { value?: string }) {
  return <button type="button" onClick={onClick} {...rest}>{children}</button>;
}

export function TabsContent(props: React.ComponentProps<'div'> & { value?: string }) {
  const { children } = props;
  return <div {...props}>{children}</div>;
}
