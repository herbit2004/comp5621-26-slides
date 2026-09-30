# COMP5621 小组演示稿

这是一套由四位组员共同维护的 HTML 演示稿。幻灯片正文为英文，维护说明为中文。当前共 21 页，保留作业原题、解答、计算和抓包截图。

## 打开与浏览

在线浏览：[GitHub Pages 演示稿](https://herbit2004.github.io/comp5621-26-slides/)。无需下载仓库，打开链接即可使用翻页和演示模式。

网站从 `main` 分支的根目录自动发布。成员修改合并并推送到 `main` 后，等待 GitHub Pages 部署完成，再刷新网页即可查看更新。根目录 `.nojekyll` 用于按原样发布 HTML 和素材，请保留。线上部署不需要执行 PDF 导出脚本。

下载或克隆**完整仓库**，双击根目录 `index.html`，用桌面版 Chrome、Edge 或 Firefox 打开。无需启动服务器，无需先安装依赖。字体、图片和页面全部使用仓库内相对路径，离线可用。

- 点击“演示模式”，用左右方向键或 Page Up / Page Down 翻页。
- 点击左侧时间轴跳到对应题目或小问。
- 修改成员页面后，刷新 `index.html` 查看结果。
- 不要单独分享 `index.html`，它需要四位组员的目录和素材。

## 目录与分工

```text
comp5621-26-slides/
├── index.html                  公共样式、组装、导航、首页和末页框架
├── build.mjs                   唯一的 PDF 导出脚本
├── README.md                   使用与协作说明
├── requirements.txt            依赖说明
├── package.json                Node 依赖及导出命令
├── asset/                      首页图片、公共字体
├── lin-fengyan/
│   ├── pages.html              Lin Fengyan：Problem 1，5 页
│   └── asset/                  这一部分使用的图片
├── gao-yuanyuan/
│   ├── pages.html              Gao Yuanyuan：Problem 2，4 页
│   └── asset/                  这一部分使用的图片
├── zhang-zhixiang/
│   ├── pages.html              Zhang Zhixiang：3(a)–3(d)，6 页
│   └── asset/                  这一部分使用的图片
├── wang-he/
│   ├── pages.html              Wang He：3(e) 与 Problem 4，5 页
│   └── asset/                  这一部分使用的图片与抓包截图
└── COMP5621_HW1_Group_Presentation.pdf   导出结果
```

首页占 1 页。最后一页仍为 4(c)，不另外增加总结口号页。首页正文在根目录，末页的题目正文归 Wang He 维护；统一框架负责它的导航、页码和页脚。

## 修改自己的部分

每个人主要修改自己目录下的 `pages.html`。每个 `<template>` 对应一页，其中包含顶部原题和 `.body-content` 内的讲解。文字和数值都直接写在 HTML 内，没有另一份隐藏的数据文件或生成入口需要同步。

```html
<template data-key="4c" data-question="4c"
          data-owner="Wang He" data-source="Homework 1 and group consensus">
  <!-- 原题区域：保留原文 -->
  <div class="original-text">...</div>
  <!-- 这一页的讲解正文 -->
  <div class="body-content">...</div>
</template>
```

- `data-key` 是页面的唯一标识，不能与其他页面重复。拆页可用 `1b-mean`、`1b-admit` 这样的不同标识。
- `data-question` 表示所属小问，同一小问拆成多页时保持相同，例如都填 `1b`。侧栏以它判断当前小问。
- `data-owner` 与 `data-source` 分别进入页脚的主讲人和来源。
- 新增页面可以复制一个完整的 `<template>` 后修改。页数和页码会自动更新；整体按四位组员的顺序，再按各文件内的顺序排列。
- 素材放在自己的 `asset/` 中，使用 `src="asset/文件名.png"`。不要写个人电脑的绝对路径，不要使用外部图片链接。
- 页面底部的本地加载桥接脚本需要保留。它让直接打开首页也能加载分散的 HTML，不需要本地服务器。
- 公共颜色、字体、尺寸、导航和页脚在根目录 `index.html` 中修改。涉及全组排版时先协商，避免同时改动公共样式。
- 修改后检查整页是否有溢出、遮挡，原题、计算、单位、图示和说明是否对应。

四个成员目录中的素材互相独立；即使文件名相同也不会冲突。公共字体仅保存于根目录 `asset/`，大家使用同一份字体文件。

## 导出 PDF

**浏览没有 Node 依赖。** 只有导出 PDF 才需要 Node.js 20 或更高版本和 Playwright。依赖版本固定在 `package.json`，详见 `requirements.txt`。

首次在仓库根目录执行：

```sh
npm install
npx playwright install chromium
```

之后每次导出：

```sh
npm run build
```

也可运行 `node build.mjs`。结果为根目录的 `COMP5621_HW1_Group_Presentation.pdf`，再次导出会覆盖同名 PDF。脚本会等待四个成员文件、字体和图片加载，并检查内容是否超出页面边界；遇到错误会停止，不输出缺页版本。正式分享前还应打开 PDF 检查截图清晰度和每页排版。

不要提交或分享 `node_modules/`。导出依赖可以重新安装；页面、图片、字体和代码需要完整保留。

## 小组协作

每次尽量只提交自己的成员目录。公共修改单独提交，说明影响哪些页面。合并后刷新首页，并重新导出 PDF；PDF 是导出结果，修改内容应以 HTML 为准。不要把自己的整份旧首页覆盖回来，也不要同时维护另一个生成稿。

仓库不会上传 Canvas，不会修改已经提交的作业。
