# アルファ文書のタイトル

これは日本語の本文です。

## 改行

Markdown標準では詰められてしまう単なる改行も、
そのまま改行として表示される。

## 画像

Markdown記法の画像:

![四角形の図](./index.assets/square.svg)

生HTMLの `<img>` タグ:

<img src="./index.assets/square.svg" alt="四角形の図（幅160px）" width="160">

## 数式

インライン数式は $E = mc^2$ のように書けます。

ブロック数式:

$$
a^2 + b^2 = c^2
$$

## 表

| 項目 | 値 |
| --- | ---: |
| 幅 | 100 |
| 高さ | 100 |

### 入れ子の見出し

三段目の見出しです。

## コード

```javascript
const answer = 42;
```
