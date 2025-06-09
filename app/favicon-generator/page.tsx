"use client";

import React from "react";
import { ConversationalGlassLogoMini } from "@/components/ConversationalGlassLogo";

export default function FaviconGenerator() {
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
      <div className="space-y-8">
        <h1 className="text-white text-2xl font-bold text-center">
          Favicon Generation Helper
        </h1>

        {/* Different sizes for testing */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 items-center">
          <div className="text-center">
            <div className="bg-white p-4 rounded-lg mb-2 inline-block">
              <ConversationalGlassLogoMini className="w-4 h-4" />
            </div>
            <p className="text-white text-sm">16x16</p>
          </div>

          <div className="text-center">
            <div className="bg-white p-4 rounded-lg mb-2 inline-block">
              <ConversationalGlassLogoMini className="w-8 h-8" />
            </div>
            <p className="text-white text-sm">32x32</p>
          </div>

          <div className="text-center">
            <div className="bg-white p-4 rounded-lg mb-2 inline-block">
              <ConversationalGlassLogoMini className="w-12 h-12" />
            </div>
            <p className="text-white text-sm">48x48</p>
          </div>

          <div className="text-center">
            <div className="bg-white p-4 rounded-lg mb-2 inline-block">
              <ConversationalGlassLogoMini className="w-16 h-16" />
            </div>
            <p className="text-white text-sm">64x64</p>
          </div>
        </div>

        {/* Main logo for screenshot */}
        <div className="text-center">
          <div className="bg-white p-8 rounded-lg mb-4 inline-block">
            <ConversationalGlassLogoMini className="w-32 h-32" />
          </div>
          <p className="text-white">
            Use this for favicon generation (512x512)
          </p>
        </div>

        <div className="text-center text-slate-300 max-w-md mx-auto">
          <p className="mb-4">
            Take a screenshot of the logo above, then use one of these favicon
            generators:
          </p>
          <ul className="space-y-2 text-sm">
            <li>
              •{" "}
              <a
                href="https://favicon.io/favicon-converter/"
                className="text-emerald-400 hover:underline"
                target="_blank"
              >
                favicon.io
              </a>
            </li>
            <li>
              •{" "}
              <a
                href="https://www.logoai.com/favicon-generator"
                className="text-emerald-400 hover:underline"
                target="_blank"
              >
                logoai.com
              </a>
            </li>
            <li>
              •{" "}
              <a
                href="https://www.favicon-generator.org/"
                className="text-emerald-400 hover:underline"
                target="_blank"
              >
                favicon-generator.org
              </a>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
