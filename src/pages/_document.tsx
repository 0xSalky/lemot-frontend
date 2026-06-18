import { Html, Head, Main, NextScript } from "next/document";

const themeSkinBootstrap = `(function(){try{var s=localStorage.getItem("lemot-theme-skin");var v=["tokyo","vegas","hacker"];document.documentElement.dataset.skin=v.indexOf(s)>=0?s:"tokyo";}catch(e){document.documentElement.dataset.skin="tokyo";}})();`;

export default function Document() {
  return (
    <Html lang="en" data-skin="tokyo" suppressHydrationWarning>
      <Head>
        <script dangerouslySetInnerHTML={{ __html: themeSkinBootstrap }} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
