'use client'

import { useEffect, useMemo, useState } from 'react'
import dynamic from "next/dynamic";
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }); }
        }
      `}</style>
    </div>
  )
}
