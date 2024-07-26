import { Leafer, Rect, Group, Box, DragEvent } from 'leafer-ui';

// 裁切模式
export type ICropMode = 'free' | 'origin' | 'ratio';

enum PointerKeys {
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
const pointStyle: Record<
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
> = {
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
};

const CROPPER_BOX_NAME = 'CropperBox';

export class Cropper extends Group {
  constructor(config: {
    restrictedArea: [number, number, number, number];
    vision: Leafer;
    originAr: number;
    onChange?: () => void;
  }) {
    super();
    const { restrictedArea, vision, originAr, onChange } = config;
    this.vision = vision;
    this.restrictedArea = restrictedArea;
    this.originAr = originAr;
    this.onChange = onChange || this.onChange;
    const [x, y, width, height] = restrictedArea;
    this.frameX = x;
    this.frameY = y;
    this.frameWidth = width;
    this.frameHeight = height;
    this.cropFrame = new Group();
    // 遮罩
    this.cropFrame.add(
      new Rect({
        x: 0,
        y: 0,
        around: 'center',
        width: 10000,
        height: 10000,
        fill: '#00000080',
      }),
    );
    this.cropRect = new Rect({
      x,
      y,
      width: this.frameWidth,
      height: this.frameHeight,
      fill: 'white',
      isEraser: true,
      cursor: 'move',
    });
    this.cropFrame.add(this.cropRect);
    // 裁切框控制器
    this.cropControl = new Box({
      x,
      y,
      width: this.frameWidth,
      height: this.frameHeight,
      name: CROPPER_BOX_NAME,
      fill: 'transparent',
      stroke: 'rgba(209, 108, 68, 1)',
      strokeWidth: 2 / this.vision.scaleX,
      overflow: 'show',
    });

    const pointerKeys = Object.keys(PointerKeys);
    for (let i = 0; i < pointerKeys.length; i++) {
      const key = pointerKeys[i];
      const { icon, width, height } = pointStyle[key];
      const value = new Rect({
        width: width / this.vision.scaleX,
        height: height / this.vision.scaleX,
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
      this.cropControl.add(value);
    }
    this.horizontalSpline = [
      new Rect({
        width: this.frameWidth,
        height: 1 / this.vision.scaleY,
        fill: '#fff',
        opacity: 0.4,
      }),
      new Rect({
        width: this.frameWidth,
        height: 1 / this.vision.scaleY,
        fill: '#fff',
        opacity: 0.4,
      }),
    ];
    this.verticalSpline = [
      new Rect({
        width: 1 / this.vision.scaleY,
        height: this.frameHeight,
        fill: '#fff',
        opacity: 0.4,
      }),
      new Rect({
        width: 1 / this.vision.scaleY,
        height: this.frameHeight,
        fill: '#fff',
        opacity: 0.4,
      }),
    ];

    this.cropControl.add(this.horizontalSpline[0]);
    this.cropControl.add(this.horizontalSpline[1]);
    this.cropControl.add(this.verticalSpline[0]);
    this.cropControl.add(this.verticalSpline[1]);

    this.draw();
    this.add(this.cropFrame);
    this.add(this.cropControl);

    // 监听事件
    this.startListener();
  }

  // 所属的视图
  vision: Leafer;

  // 裁切框X坐标
  frameX: number;
  // 裁切框Y坐标
  frameY: number;

  // 限制范围,所有控制点只能在这个范围内移动
  restrictedArea: [number, number, number, number];

  get restrictedWidth() {
    return this.restrictedArea[2];
  }

  get restrictedHeight() {
    return this.restrictedArea[3];
  }

  originAr: number;

  // 8个拖拽点
  pointers: IPointers = {} as IPointers;
  pointerKeys: Array<PointerKeys> = [];
  pointerValues = [];

  cropMode: ICropMode = 'free';
  cropRatio = 1;

  onChange = () => {};

  //#region 元素
  // 裁切框宽度
  frameWidth: number;
  // 裁切框高度
  frameHeight: number;

  // 裁切遮罩
  cropFrame: Group;
  // 遮罩透明透出部分
  cropRect: Rect;

  // 裁切框控制器
  cropControl: Group;

  // 水平辅助线
  horizontalSpline: [Rect, Rect];

  // 竖直辅助线
  verticalSpline: [Rect, Rect];

  //#endregion

  // 获取裁切框四个顶点坐标
  getVertexCoordinates() {
    return [
      { x: this.frameX, y: this.frameY },
      { x: this.frameX + this.frameWidth, y: this.frameY },
      { x: this.frameX, y: this.frameY + this.frameHeight },
      { x: this.frameX + this.frameWidth, y: this.frameY + this.frameHeight },
    ];
  }

  // 设置裁切框位置信息
  setPhase(x, y, width, height) {
    this.frameX = x;
    this.frameY = y;
    this.frameWidth = width;
    this.frameHeight = height;

    this.draw();
  }

  // 对控制器进行绘制
  draw() {
    this.cropRect.set({
      x: this.frameX,
      y: this.frameY,
      width: this.frameWidth,
      height: this.frameHeight,
    });
    this.cropControl.set({
      x: this.frameX,
      y: this.frameY,
      width: this.frameWidth,
      height: this.frameHeight,
    });
    this.pointerKeys.forEach((key) => {
      const offset = pointStyle[key].offset;
      switch (key) {
        case PointerKeys.Left:
          this.pointers[key].set({
            x: 0 + offset.x,
            y: this.frameHeight / 2 + offset.y,
          });
          break;

        case PointerKeys.LeftTop:
          this.pointers[key].set({
            x: 0 + offset.x,
            y: 0 + offset.y,
          });
          break;
        case PointerKeys.Top:
          this.pointers[key].set({
            x: this.frameWidth / 2 + offset.x,
            y: 0 + offset.y,
          });
          break;
        case PointerKeys.RightTop:
          this.pointers[key].set({
            x: this.frameWidth + offset.x,
            y: 0 + offset.y,
          });
          break;
        case PointerKeys.Right:
          this.pointers[key].set({
            x: this.frameWidth + offset.x,
            y: this.frameHeight / 2 + offset.y,
          });
          break;
        case PointerKeys.RightBottom:
          this.pointers[key].set({
            x: this.frameWidth + offset.x,
            y: this.frameHeight + offset.y,
          });
          break;
        case PointerKeys.Bottom:
          this.pointers[key].set({
            x: this.frameWidth / 2 + offset.x,
            y: this.frameHeight + offset.y,
          });
          break;
        case PointerKeys.LeftBottom:
          this.pointers[key].set({
            x: 0 + offset.x,
            y: this.frameHeight + offset.y,
          });
          break;
      }
    });

    this.horizontalSpline[0].set({
      width: this.frameWidth,
      x: 0,
      y: this.frameHeight / 3,
    });
    this.horizontalSpline[1].set({
      width: this.frameWidth,
      x: 0,
      y: (2 * this.frameHeight) / 3,
    });
    this.verticalSpline[0].set({
      y: 0,
      x: this.frameWidth / 3,
      height: this.frameHeight,
    });
    this.verticalSpline[1].set({ y: 0, x: (2 * this.frameWidth) / 3, height: this.frameHeight });

    this.onChange();
  }

  // 设置裁切框模式
  setCropMode(mode: ICropMode, ratio: number) {
    this.cropMode = mode;
    this.cropRatio = ratio;
    if (this.cropMode === 'origin') {
      if (this.frameWidth / this.frameHeight > this.originAr) {
        this.frameWidth = this.frameHeight * this.originAr;
      } else {
        this.frameHeight = this.frameWidth / this.originAr;
      }
    } else if (this.cropMode === 'ratio') {
      this.frameX = 0;
      this.frameY = 0;
      if (this.cropRatio < this.originAr) {
        this.frameHeight = this.restrictedHeight;
        this.frameWidth = this.frameHeight * this.cropRatio;
      } else {
        this.frameWidth = this.restrictedWidth;
        this.frameHeight = this.frameWidth / this.cropRatio;
      }
    }
    this.draw();
  }

  onDrag = (e: DragEvent) => {
    // 拖拽控制点
    if (this.pointerKeys.includes(e.target.name as PointerKeys)) {
      this[`drag${e.target.name}Pointer`]({
        moveX: e.moveX / this.vision.scaleX,
        moveY: e.moveY / this.vision.scaleY,
      });
    }
    // 拖拽裁切框
    else if (CROPPER_BOX_NAME === e.target.name) {
      this.dragFrame({
        moveX: e.moveX / this.vision.scaleX,
        moveY: e.moveY / this.vision.scaleY,
      });
    }
    this.draw();
  };

  // 拖拽整个裁剪框
  dragFrame = ({ moveX, moveY }) => {
    const targetX = this.frameX + moveX;
    const targetY = this.frameY + moveY;
    if (!(targetX + this.frameWidth > this.restrictedWidth || targetX < 0)) {
      this.frameX = targetX;
    }
    if (!(targetY + this.frameHeight > this.restrictedHeight || targetY < 0)) {
      this.frameY = targetY;
    }
  };

  startListener() {
    this.vision.on(DragEvent.DRAG, this.onDrag);
  }

  // 拖拽左上角的点，根据水平拖拽距离做x、y等比缩放
  dragLeftTopPointer = ({ moveX, moveY }) => {
    this.dragLeftPointer({ moveX });
    this.dragTopPointer({ moveY });
  };

  // 拖拽右上角的点，根据水平拖拽距离做x、y等比缩放
  dragRightTopPointer = ({ moveX, moveY }) => {
    this.dragRightPointer({ moveX });
    this.dragTopPointer({ moveY });
  };

  // 拖拽右下角的点，根据水平拖拽距离做x、y等比缩放
  dragRightBottomPointer = ({ moveX, moveY }) => {
    this.dragRightPointer({ moveX });
    this.dragBottomPointer({ moveY });
  };

  // 拖拽左下角的点，根据水平拖拽距离做等x、y比缩放
  dragLeftBottomPointer = ({ moveX, moveY }) => {
    this.dragLeftPointer({ moveX });
    this.dragBottomPointer({ moveY });
  };

  dragGuide(x, y, w, h) {
    if (x < 0 || x + w > this.restrictedWidth) {
      return false;
    }
    if (y < 0 || y + h > this.restrictedHeight) {
      return false;
    }
    if (w < 30 || h < 30) {
      return false;
    }

    return true;
  }

  // 拖拽左边的点，根据水平拖拽距离做x缩放
  dragLeftPointer = ({ moveX }) => {
    const x = this.frameX + moveX;
    const y = this.frameY;
    const w = this.frameWidth - moveX;
    const h =
      this.cropMode === 'free'
        ? this.frameHeight
        : this.cropMode === 'origin'
        ? w / this.originAr
        : w / this.cropRatio;

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
      this.cropMode === 'free'
        ? this.frameWidth
        : this.cropMode === 'origin'
        ? h * this.originAr
        : h * this.cropRatio;

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
      this.cropMode === 'free'
        ? this.frameHeight
        : this.cropMode === 'origin'
        ? w / this.originAr
        : w / this.cropRatio;

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
      this.cropMode === 'free'
        ? this.frameWidth
        : this.cropMode === 'origin'
        ? h * this.originAr
        : h * this.cropRatio;

    if (this.dragGuide(x, y, w, h)) {
      this.frameX = x;
      this.frameY = y;
      this.frameWidth = w;
      this.frameHeight = h;
    }
  };
}
