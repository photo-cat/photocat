import { Leafer, Rect, Group, Box, DragEvent, ZoomEvent } from 'leafer-ui';

// 控制模式
export type IControllerMode = 'free' | 'origin' | 'ratio';

export enum PointerKeys {
  Left = 'Left',
  LeftTop = 'LeftTop',
  Top = 'Top',
  RightTop = 'RightTop',
  Right = 'Right',
  RightBottom = 'RightBottom',
  Bottom = 'Bottom',
  LeftBottom = 'LeftBottom',
}

interface IPointers {
  [PointerKeys.Left]: Rect;
  [PointerKeys.LeftTop]: Rect;
  [PointerKeys.Top]: Rect;
  [PointerKeys.RightTop]: Rect;
  [PointerKeys.Right]: Rect;
  [PointerKeys.RightBottom]: Rect;
  [PointerKeys.Bottom]: Rect;
  [PointerKeys.LeftBottom]: Rect;
}

// 控制点对应的 cursor
const pointCursor: Record<PointerKeys, string> = {
  [PointerKeys.Left]: 'w-resize',
  [PointerKeys.LeftTop]: 'nw-resize',
  [PointerKeys.Top]: 'n-resize',
  [PointerKeys.RightTop]: 'ne-resize',
  [PointerKeys.Right]: 'e-resize',
  [PointerKeys.RightBottom]: 'se-resize',
  [PointerKeys.Bottom]: 's-resize',
  [PointerKeys.LeftBottom]: 'sw-resize',
};

// 控制点对应的样式
type IPointStyle = Record<
  PointerKeys,
  {
    icon: string;
    width: number;
    height: number;
    offset: {
      x: number;
      y: number;
    };
  }
>;

const controllerStyle: Record<
  string,
  {
    pointStyle: IPointStyle;
    color: string;
  }
> = {
  back: {
    pointStyle: {
      [PointerKeys.Left]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/b9841fdc036442018db47c0ce2bada3b.svg',
        width: 4,
        height: 12,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.LeftTop]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/cd335940472a429e91fa10d693ef5e05.svg',
        width: 12,
        height: 12,
        offset: {
          x: 6,
          y: 6,
        },
      },
      [PointerKeys.Top]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/4c511d3f410648358e04d40c018ec49c.svg',
        width: 12,
        height: 4,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.RightTop]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/5b23692dd0ef4d75a77aea4b7e6222c7.svg',
        width: 12,
        height: 12,
        offset: {
          x: -6,
          y: 6,
        },
      },
      [PointerKeys.Right]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/b9841fdc036442018db47c0ce2bada3b.svg',
        width: 4,
        height: 12,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.RightBottom]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/0acc93de221f4de59aa35c9fdd4335a2.svg',
        width: 12,
        height: 12,
        offset: {
          x: -6,
          y: -6,
        },
      },
      [PointerKeys.Bottom]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/4c511d3f410648358e04d40c018ec49c.svg',
        width: 12,
        height: 4,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.LeftBottom]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/8e4d22a7a7a74f08b1456c0553ded86d.svg',
        width: 12,
        height: 12,
        offset: {
          x: 6,
          y: -6,
        },
      },
    },
    color: 'rgba(209, 108, 68, 1)',
  },
  fore: {
    pointStyle: {
      [PointerKeys.Left]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/912b5a4318024325a124e4986ddcd355.svg',
        width: 8,
        height: 8,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.LeftTop]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/912b5a4318024325a124e4986ddcd355.svg',
        width: 8,
        height: 8,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.Top]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/912b5a4318024325a124e4986ddcd355.svg',
        width: 8,
        height: 8,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.RightTop]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/912b5a4318024325a124e4986ddcd355.svg',
        width: 8,
        height: 8,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.Right]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/912b5a4318024325a124e4986ddcd355.svg',
        width: 8,
        height: 8,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.RightBottom]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/912b5a4318024325a124e4986ddcd355.svg',
        width: 8,
        height: 8,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.Bottom]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/912b5a4318024325a124e4986ddcd355.svg',
        width: 8,
        height: 8,
        offset: {
          x: 0,
          y: 0,
        },
      },
      [PointerKeys.LeftBottom]: {
        icon: 'https://aiad-prod.oss-cn-heyuan.aliyuncs.com/public/912b5a4318024325a124e4986ddcd355.svg',
        width: 8,
        height: 8,
        offset: {
          x: 0,
          y: 0,
        },
      },
    },
    color: '#00EBA5',
  },
};

const CONTROLLER_BOX_NAME = 'ControllerBox';

function inRange(val, [min, max]) {
  return Math.max(min, Math.min(max, val));
}

function overRange(val, [min, max]) {
  return val < min || val > max;
}

export class Controller extends Group {
  constructor(config: {
    theme: string;
    originX?: number;
    originY?: number;
    originWidth: number;
    originHeight: number;
    vision: Leafer;
    originAr: number;
    mode?: IControllerMode;
    minWidth?: number;
    minHeight?: number;
    maxWidth?: number;
    maxHeight?: number;
    showMask?: boolean;
    hidePointerKeys?: PointerKeys[];
    onChange?: (x, y, width, height) => void;
    dragGuide?: (x, y, width, height) => boolean;
    dragEnd?: () => void;
    drag?: (options: {
      x: number;
      y: number;
      width: number;
      height: number;
      dragEvent: DragEvent;
      isDragPointer: boolean;
      isDragBox: boolean;
    }) => void;
  }) {
    super();
    const {
      originX,
      originY,
      originWidth,
      originHeight,
      vision,
      originAr,
      onChange,
      dragGuide,
      drag,
      dragEnd,
      mode,
      theme,
      minWidth,
      minHeight,
      maxWidth,
      maxHeight,
      hidePointerKeys,
      showMask = true,
    } = config;
    this.originWidth = originWidth;
    this.originHeight = originHeight;
    this.vision = vision;
    this.originAr = originAr;
    this.controlMode = mode || this.controlMode;
    this.onChange = onChange || this.onChange;
    this.dragGuide = dragGuide || this.dragGuide;
    this.dragEnd = dragEnd || this.dragEnd;
    this.drag = drag || this.drag;
    this.frameX = originX || 0;
    this.frameY = originY || 0;
    this.frameWidth = originWidth;
    this.frameHeight = originHeight;
    this.minWidth = minWidth || 64;
    this.minHeight = minHeight || 64;
    this.maxWidth = maxWidth || 1536;
    this.maxHeight = maxHeight || 1536;
    this.controllerFrame = new Group();
    this.hidePointerKeys = hidePointerKeys || [];

    const { pointStyle, color } = controllerStyle[theme || 'back'];
    this.pointStyle = pointStyle;
    this.themeColor = color;
    // 遮罩
    if (showMask) {
      this.controllerFrame.add(
        new Rect({
          x: 0,
          y: 0,
          around: 'center',
          width: 10000,
          height: 10000,
          fill: '#00000080',
        }),
      );
    }

    this.controllerRect = new Rect({
      width: this.frameWidth,
      height: this.frameHeight,
      fill: 'white',
      isEraser: true,
      cursor: 'move',
    });
    this.controllerFrame.add(this.controllerRect);
    // 控制框控制器
    this.controllerControl = new Box({
      width: this.frameWidth,
      height: this.frameHeight,
      name: CONTROLLER_BOX_NAME,
      fill: 'transparent',
      stroke: this.themeColor,
      overflow: 'show',
    });

    const pointerKeys = Object.keys(PointerKeys).filter((v) => !this.hidePointerKeys.includes(v));
    for (let i = 0; i < pointerKeys.length; i++) {
      const key = pointerKeys[i];
      const { icon, width, height } = this.pointStyle[key];
      const value = new Rect({
        width: width,
        height: height,
        name: key,
        around: 'center',
        fill: {
          type: 'image',
          url: icon,
        },
        cursor: pointCursor[key],
      });
      this.pointers[key] = value;
      this.pointerKeys.push(key);
      this.pointerValues.push(value);
      this.controllerControl.add(value);
    }

    this.draw();
    this.add(this.controllerFrame);
    this.add(this.controllerControl);

    // 监听事件
    this.startListener();

    this.vision.on(ZoomEvent.ZOOM, this.handleAppZoom);
  }

  pointStyle: IPointStyle;
  themeColor: string;

  // 所属的视图
  vision: Leafer;

  originWidth: number;
  originHeight: number;

  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;

  // 控制框X坐标
  frameX: number;
  // 控制框Y坐标
  frameY: number;

  originAr: number;

  // 8个拖拽点
  pointers: IPointers = {} as IPointers;
  pointerKeys: Array<PointerKeys> = [];
  pointerValues = [];
  hidePointerKeys: Array<PointerKeys> = [];

  controlMode: IControllerMode = 'free';
  controllerRatio = 1;

  onChange = (x, y, width, height) => {};

  handleAppZoom = () => {
    this.draw();
  };

  setFrameWidth(width: number) {
    if (!width) return;
    const w = inRange(width, [this.minWidth, this.maxWidth]);
    if (this.controlMode === 'free') {
      this.frameWidth = w;
    } else {
      const willHeight =
        this.controlMode === 'origin' ? w / this.originAr : w / this.controllerRatio;
      if (overRange(willHeight, [this.minHeight, this.maxHeight])) {
        const h = inRange(willHeight, [this.minHeight, this.maxHeight]);
        const willWidth =
          this.controlMode === 'origin' ? h * this.originAr : h * this.controllerRatio;
        this.frameWidth = willWidth;
        this.frameHeight = h;
      } else {
        this.frameWidth = w;
        this.frameHeight = willHeight;
      }
    }

    this.setPhase(
      Math.ceil(this.frameX),
      Math.ceil(this.frameY),
      Math.ceil(this.frameWidth),
      Math.ceil(this.frameHeight),
    );
  }

  setFrameHeight(height: number) {
    if (!height) return;
    const h = inRange(height, [this.minHeight, this.maxHeight]);
    if (this.controlMode === 'free') {
      this.frameHeight = h;
    } else {
      const willWidth =
        this.controlMode === 'origin' ? h * this.originAr : h * this.controllerRatio;
      if (overRange(willWidth, [this.minWidth, this.maxWidth])) {
        const w = inRange(willWidth, [this.minWidth, this.maxWidth]);
        const willHeight =
          this.controlMode === 'origin' ? w / this.originAr : w / this.controllerRatio;
        this.frameWidth = w;
        this.frameHeight = willHeight;
      } else {
        this.frameWidth = willWidth;
        this.frameHeight = h;
      }
    }

    this.setPhase(
      Math.ceil(this.frameX),
      Math.ceil(this.frameY),
      Math.ceil(this.frameWidth),
      Math.ceil(this.frameHeight),
    );
  }

  //#region 元素
  // 控制框宽度
  frameWidth: number;
  // 控制框高度
  frameHeight: number;

  // 控制遮罩
  controllerFrame: Group;
  // 遮罩透明透出部分
  controllerRect: Rect;

  // 控制框控制器
  controllerControl: Group;

  //#endregion

  // 获取控制框四个顶点坐标
  getVertexCoordinates() {
    return [
      { x: this.frameX, y: this.frameY },
      { x: this.frameX + this.frameWidth, y: this.frameY },
      { x: this.frameX, y: this.frameY + this.frameHeight },
      { x: this.frameX + this.frameWidth, y: this.frameY + this.frameHeight },
    ];
  }

  // 设置控制框位置信息
  setPhase(x, y, width, height) {
    this.frameX = x;
    this.frameY = y;
    this.frameWidth = width;
    this.frameHeight = height;

    this.draw();
  }

  setX(x) {
    this.frameX = x;
    this.draw();
  }
  setY(y) {
    this.frameY = y;
    this.draw();
  }
  setSize(width, height) {
    this.frameWidth = width;
    this.frameHeight = height;
    this.draw();
  }

  // 对控制器进行绘制
  draw() {
    const scale = 1 / this.vision.scaleX;

    this.controllerRect.set({
      x: this.frameX,
      y: this.frameY,
      width: this.frameWidth,
      height: this.frameHeight,
    });
    this.controllerControl.set({
      x: this.frameX,
      y: this.frameY,
      width: this.frameWidth,
      height: this.frameHeight,
      strokeWidth: scale,
    });

    this.pointerKeys
      .filter((v) => !this.hidePointerKeys.includes(v))
      .forEach((key) => {
        const offset = this.pointStyle[key].offset;
        switch (key) {
          case PointerKeys.Left:
            this.pointers[key].set({
              x: 0 + offset.x,
              y: this.frameHeight / 2 + offset.y,
              scale,
            });
            break;

          case PointerKeys.LeftTop:
            this.pointers[key].set({
              x: 0 + offset.x,
              y: 0 + offset.y,
              scale,
            });
            break;
          case PointerKeys.Top:
            this.pointers[key].set({
              x: this.frameWidth / 2 + offset.x,
              y: 0 + offset.y,
              scale,
            });
            break;
          case PointerKeys.RightTop:
            this.pointers[key].set({
              x: this.frameWidth + offset.x,
              y: 0 + offset.y,
              scale,
            });
            break;
          case PointerKeys.Right:
            this.pointers[key].set({
              x: this.frameWidth + offset.x,
              y: this.frameHeight / 2 + offset.y,
              scale,
            });
            break;
          case PointerKeys.RightBottom:
            this.pointers[key].set({
              x: this.frameWidth + offset.x,
              y: this.frameHeight + offset.y,
              scale,
            });
            break;
          case PointerKeys.Bottom:
            this.pointers[key].set({
              x: this.frameWidth / 2 + offset.x,
              y: this.frameHeight + offset.y,
              scale,
            });
            break;
          case PointerKeys.LeftBottom:
            this.pointers[key].set({
              x: 0 + offset.x,
              y: this.frameHeight + offset.y,
              scale,
            });
            break;
        }
      });

    this.onChange(this.frameX, this.frameY, this.frameWidth, this.frameHeight);
  }

  // 设置控制框模式
  setControllerMode(mode: IControllerMode, ratio: number) {
    this.controlMode = mode;
    this.controllerRatio = ratio;
    if (this.controlMode === 'origin') {
      if (this.frameWidth / this.frameHeight > this.originAr) {
        const w = inRange(this.frameHeight * this.originAr, [this.minWidth, this.maxWidth]);
        const willH = w / this.originAr;
        if (overRange(willH, [this.minHeight, this.maxHeight])) {
          this.frameHeight = inRange(willH, [this.minHeight, this.maxHeight]);
          this.frameWidth = this.frameHeight * this.originAr;
        } else {
          this.frameWidth = w;
          this.frameHeight = willH;
        }
      } else {
        const h = inRange(this.frameWidth / this.originAr, [this.minHeight, this.maxHeight]);
        const willW = h * this.originAr;
        if (overRange(willW, [this.minWidth, this.maxWidth])) {
          this.frameWidth = inRange(willW, [this.minWidth, this.maxWidth]);
          this.frameHeight = this.frameWidth / this.originAr;
        } else {
          this.frameWidth = willW;
          this.frameHeight = h;
        }
      }
    } else if (this.controlMode === 'ratio') {
      this.frameX = 0;
      this.frameY = 0;
      if (this.controllerRatio < this.originAr) {
        this.frameHeight = this.originHeight;
        this.frameWidth = this.frameHeight * this.controllerRatio;
      } else {
        this.frameWidth = this.originWidth;
        this.frameHeight = this.frameWidth / this.controllerRatio;
      }
    }

    this.setPhase(
      Math.ceil(this.frameX),
      Math.ceil(this.frameY),
      Math.ceil(this.frameWidth),
      Math.ceil(this.frameHeight),
    );
  }

  onDrag = (e: DragEvent) => {
    if (!this.visible) return;

    const isDragPointer = this.pointerKeys.includes(e.target.name as PointerKeys);
    const isDragBox = CONTROLLER_BOX_NAME === e.target.name;
    // 拖拽控制点
    if (isDragPointer) {
      this[`drag${e.target.name}Pointer`]({
        moveX: e.moveX / this.vision.scaleX,
        moveY: e.moveY / this.vision.scaleY,
      });
    }
    // 拖拽控制框
    else if (isDragBox) {
      this.dragFrame({
        moveX: e.moveX / this.vision.scaleX,
        moveY: e.moveY / this.vision.scaleY,
      });
    }
    this.draw();
    this.drag({
      x: this.frameX,
      y: this.frameY,
      width: this.frameWidth,
      height: this.frameHeight,
      dragEvent: e,
      isDragPointer,
      isDragBox,
    });
  };

  onDragEnd = () => {
    this.setPhase(
      Math.ceil(this.frameX),
      Math.ceil(this.frameY),
      Math.ceil(this.frameWidth),
      Math.ceil(this.frameHeight),
    );
    this.dragEnd();
  };

  // 拖拽整个裁剪框
  dragFrame = ({ moveX, moveY }) => {
    const targetX = this.frameX + moveX;
    const targetY = this.frameY + moveY;

    if (this.dragGuide(targetX, this.frameY, this.frameWidth, this.frameHeight)) {
      this.frameX = targetX;
    }
    if (this.dragGuide(this.frameX, targetY, this.frameWidth, this.frameHeight)) {
      this.frameY = targetY;
    }
  };

  startListener() {
    this.vision.on(DragEvent.DRAG, this.onDrag);
    this.vision.on(DragEvent.END, this.onDragEnd);
  }

  destroy() {
    this.vision.off(ZoomEvent.ZOOM, this.handleAppZoom);
    this.vision.off(DragEvent.DRAG, this.onDrag);
    this.vision.off(DragEvent.END, this.onDragEnd);
  }

  // 拖拽左上角的点，根据水平拖拽距离做x、y等比缩放
  dragLeftTopPointer = ({ moveX, moveY }) => {
    this.dragLeftPointer({ moveX });

    this.dragTopPointer({
      moveY: moveX / (this.controlMode === 'free' ? this.originAr : this.controllerRatio),
    });
  };

  // 拖拽右上角的点，根据水平拖拽距离做x、y等比缩放
  dragRightTopPointer = ({ moveX, moveY }) => {
    this.dragRightPointer({ moveX });
    this.dragTopPointer({
      moveY: -moveX / (this.controlMode === 'free' ? this.originAr : this.controllerRatio),
    });
  };

  // 拖拽右下角的点，根据水平拖拽距离做x、y等比缩放
  dragRightBottomPointer = ({ moveX, moveY }) => {
    this.dragRightPointer({ moveX });
    this.dragBottomPointer({
      moveY: moveX / (this.controlMode === 'free' ? this.originAr : this.controllerRatio),
    });
  };

  // 拖拽左下角的点，根据水平拖拽距离做等x、y比缩放
  dragLeftBottomPointer = ({ moveX, moveY }) => {
    this.dragLeftPointer({ moveX });
    this.dragBottomPointer({
      moveY: -moveX / (this.controlMode === 'free' ? this.originAr : this.controllerRatio),
    });
  };

  dragGuide = (x, y, w, h) => {
    if (w < this.minWidth || h < this.minHeight || w > this.maxWidth || h > this.maxHeight) {
      return false;
    }

    return true;
  };

  dragEnd = () => {};

  drag = (options: {
    x: number;
    y: number;
    width: number;
    height: number;
    dragEvent: DragEvent;
  }) => {};

  // 拖拽左边的点，根据水平拖拽距离做x缩放
  dragLeftPointer = ({ moveX }) => {
    const x = this.frameX + moveX;
    const y = this.frameY;
    const w = this.frameWidth - moveX;
    const h =
      this.controlMode === 'free'
        ? this.frameHeight
        : this.controlMode === 'origin'
        ? w / this.originAr
        : w / this.controllerRatio;

    if (this.dragGuide(x, y, w, h)) {
      this.frameX = x;
      this.frameY = y;
      this.frameWidth = w;
      this.frameHeight = h;
    }
  };

  // 拖拽上边的点，根据垂直拖拽距离做y缩放
  dragTopPointer = ({ moveY }) => {
    const y = this.frameY + moveY;
    const x = this.frameX;
    const h = this.frameHeight - moveY;
    const w =
      this.controlMode === 'free'
        ? this.frameWidth
        : this.controlMode === 'origin'
        ? h * this.originAr
        : h * this.controllerRatio;

    if (this.dragGuide(x, y, w, h)) {
      this.frameX = x;
      this.frameY = y;
      this.frameWidth = w;
      this.frameHeight = h;
    }
  };

  // 拖拽右边的点，根据水平拖拽距离做x缩放
  dragRightPointer = ({ moveX }) => {
    const x = this.frameX;
    const y = this.frameY;
    const w = this.frameWidth + moveX;
    const h =
      this.controlMode === 'free'
        ? this.frameHeight
        : this.controlMode === 'origin'
        ? w / this.originAr
        : w / this.controllerRatio;

    if (this.dragGuide(x, y, w, h)) {
      this.frameX = x;
      this.frameY = y;
      this.frameWidth = w;
      this.frameHeight = h;
    }
  };

  // 拖拽下边的点，根据垂直拖拽距离做y缩放
  dragBottomPointer = ({ moveY }) => {
    const y = this.frameY;
    const x = this.frameX;
    const h = this.frameHeight + moveY;
    const w =
      this.controlMode === 'free'
        ? this.frameWidth
        : this.controlMode === 'origin'
        ? h * this.originAr
        : h * this.controllerRatio;

    if (this.dragGuide(x, y, w, h)) {
      this.frameX = x;
      this.frameY = y;
      this.frameWidth = w;
      this.frameHeight = h;
    }
  };
}
