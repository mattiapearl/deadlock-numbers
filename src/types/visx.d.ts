declare module "@visx/responsive" {
  import * as React from "react";

  export interface ParentSizeProps {
    children: (
      size: {
        width: number;
        height: number;
        top?: number;
        left?: number;
        ref?: (element: HTMLElement | null) => void;
      },
    ) => React.ReactNode;
    className?: string;
    debounceTime?: number;
  }

  export const ParentSize: React.FC<ParentSizeProps>;
  export default ParentSize;
}

declare module "@visx/xychart" {
  import * as React from "react";

  type VisxComponentProps = Record<string, unknown>;

  export const XYChart: React.ComponentType<VisxComponentProps>;
  export const AnimatedAxis: React.ComponentType<VisxComponentProps>;
  export const AnimatedGrid: React.ComponentType<VisxComponentProps>;
  export const AnimatedLineSeries: React.ComponentType<VisxComponentProps>;
  export const Tooltip: React.ComponentType<VisxComponentProps>;
}


