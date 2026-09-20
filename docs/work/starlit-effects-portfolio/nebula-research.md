# 真實星雲的可參考結構
日期：2026-09-20。用途：本工作包 Developer／Review 共用參考。問題：真實星雲具有哪些可辨結構，可作暗色網站雲層的視覺依據？本文件不裁定美感或實作方式。

## 有第一手來源支持的特徵
- 星雲並非均勻一團霧。ESA 的創生之柱可見發光氣體、細長暗塵與緻密柱體；可見光和紅外線揭露不同層次。[ESA/Hubble：可見光與紅外線比較](https://esahubble.org/images/heic1501c/)
- 反射星雲的光來自星光被塵埃散射。NASA 的昴宿塵埃雲影像呈現薄而有方向的絲狀紋理，較大的塵粒和細塵受到輻射影響不同。[NASA：Ghostly Reflections in the Pleiades](https://science.nasa.gov/asset/hubble/ghostly-reflections-in-the-pleiades/)、[NASA：Reflecting Merope](https://science.nasa.gov/missions/hubble/reflecting-merope-2/)
- 暗塵可阻擋後方可見光，形成雲中暗部與空隙；反射、發射、暗星雲有不同發光／遮蔽機制，不應把它們全部當成發亮煙霧。[NASA：Decoding Nebulae](https://science.nasa.gov/universe/stories/quick-reads/decoding-nebulae/)
- Iris Nebula 的塵埃反射星光；不能把網站偏金色的處理宣稱為所有真實星雲的自然顏色。[NASA：Caldwell 4](https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-4/)

## 視覺判讀與未知
「疏密差異、暗部負空間、細絲方向、局部亮邊與大尺度輪廓同時存在會比較有層次」是本案從影像作的設計判讀，並非上述機構證明美感的科學結論。網站深靛暗底與淡金受光由使用者主題決定，屬風格化，不宣稱天文照片原色。美感仍由使用者看實際頁面判定。

目前本機背景由兩尺度SVG fractalNoise矩形疊加；受光層僅徑向遮罩，沒有內容區左緣至1/3的逐像素漸變。此為直接讀 components/starlit-nebula.tsx/.css 得到的本機事實，與截圖分界處的亮斑相符。使用者另明確要求接縫完全無光，這是產品規格，不是天文研究結論。

## 圖像參考（研究用，不引入正式資產）
- https://esahubble.org/images/opo0036a/
- https://esahubble.org/images/heic1501c/
- https://science.nasa.gov/mission/hubble/science/explore-the-night-sky/hubble-caldwell-catalog/caldwell-4/
保留站內既有 code-native 繪製；本文件未授權下載圖片作背景或變更人物。