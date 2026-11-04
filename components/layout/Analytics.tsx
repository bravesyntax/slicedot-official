import Script from "next/script";
import { getSeoSettings } from "@/lib/settings";

// Google Analytics and Tag Manager, from the IDs in seo_settings. Nothing loads while they're empty.
export default async function Analytics() {
  const { analyticsId, tagManagerId } = await getSeoSettings();
  const ga = /^G-[A-Z0-9]+$|^UA-\d+-\d+$/.test(analyticsId) ? analyticsId : "";
  const gtm = /^GTM-[A-Z0-9]+$/.test(tagManagerId) ? tagManagerId : "";
  return (
    <>
      {ga && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
          <Script id="ga-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${ga}');`}</Script>
        </>
      )}
      {gtm && <Script id="gtm-init" strategy="afterInteractive">{`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${gtm}');`}</Script>}
    </>
  );
}
