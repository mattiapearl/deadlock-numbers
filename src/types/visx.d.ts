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

  export const XYChart: React.FC<any>;
  export const AnimatedAxis: React.FC<any>;
  export const AnimatedGrid: React.FC<any>;
  export const AnimatedLineSeries: React.FC<any>;
  export const Tooltip: React.FC<any>;
}


