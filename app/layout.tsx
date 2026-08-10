import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
const geistSans=Geist({variable:"--font-geist-sans",subsets:["latin"]});
const geistMono=Geist_Mono({variable:"--font-geist-mono",subsets:["latin"]});
export const metadata:Metadata={
  title:"Warden of the Wild",
  description:"A handcrafted elemental tower defense game. Bind the elements, trigger powerful reactions, and defend the Heartstone.",
  icons:{icon:"/favicon.svg"},
  openGraph:{title:"Warden of the Wild",description:"Bind the elements. Break the horde.",type:"website",images:[{url:"/og.png",width:1536,height:904,alt:"Warden of the Wild elemental towers defending the Heartstone"}]},
  twitter:{card:"summary_large_image",title:"Warden of the Wild",description:"Bind the elements. Break the horde.",images:["/og.png"]}
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body className={`${geistSans.variable} ${geistMono.variable}`}>{children}</body></html>}
