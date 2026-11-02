---
title: '阅读验收夹具 A：中文 English 2026 技术长标题 ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
date: 2026-10-29T12:30:00+08:00
updated: 2026-10-29T12:30:00+08:00
comments: false
copyright: false
toc: true
---

本文是自动化阅读验收夹具，不是正式发布文章。Chinese 中文混排、English words、1234567890、标点（括号）与单位 3.3 V / 115200 baud。

## 段落与列表

段落层级测试：Orange Pi 工程日志，包含 **加粗**、*强调*、[普通链接](https://example.invalid/) 与 `inline_code_中文_123`。

- 一级列表：中文、English、123。
  - 二级列表：嵌套内容。
1. 有序步骤 A。
2. 有序步骤 B。

> 引用块测试：保留上下文与注意事项，不将浅色文字叠在浅色背景上。

### 长链接与行内代码

https://example.invalid/ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789

`ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`

## 代码与复制

```javascript
const message = '中文 <tag> & "quote" + 123';
console.log(message);
const longLine = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
```

```text
01 中文 English
02 <tag> & special
03 1234567890
04 four
05 five
06 six
07 seven
08 eight
09 nine
10 ten
11 eleven
12 twelve
13 thirteen
14 fourteen
15 fifteen
16 sixteen
17 seventeen
18 eighteen
19 nineteen
20 twenty
21 end
```

## 数学公式

行内公式 $E=mc^2$ 和 $x_{i}^{2}+y_{j}^{3}$，分数 $\frac{a+b}{c+d}$。

$$
\sum_{i=1}^{n} i^2 = \frac{n(n+1)(2n+1)}{6}
$$

$$
A=\begin{bmatrix}1 & 2 \\ 3 & 4\end{bmatrix}
$$

$$
\underbrace{a_1+a_2+a_3+a_4+a_5+a_6+a_7+a_8+a_9+a_{10}+a_{11}+a_{12}+a_{13}+a_{14}+a_{15}+a_{16}+a_{17}+a_{18}+a_{19}+a_{20}}_{\text{移动端长公式需要局部滚动}}=\sum_{i=1}^{20}a_i
$$

## 图片与表格

![验收用几何图，2000×900，不是用户素材](/reading-fixture.svg)

| 类型 | 中文说明 | 长标识符 | 数值 |
|---|---|---|---|
| UART | 串口数据 | ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 | 115200 |
| SPI | 时钟频率 | ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 | 24000000 |

## 末尾定位

末尾目录定位目标。下面的链接用于真实 PJAX 文章切换。

[前往阅读验收夹具 B](/2026/10/28/reading-b/)
