const Globe = ({ className = "" }: { className?: string }) => (
  <svg
    aria-hidden="true"
    className={`block shrink-0 ${className}`.trim()}
    fill="none"
    preserveAspectRatio="xMidYMid meet"
    viewBox="0 0 400 400"
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Outer circle */}
    <circle
      cx="200"
      cy="200"
      opacity="0.3"
      r="180"
      stroke="currentColor"
      strokeWidth="1.5"
    />

    {/* Latitude lines */}
    <ellipse
      cx="200"
      cy="200"
      opacity="0.12"
      rx="180"
      ry="40"
      stroke="currentColor"
      strokeWidth="0.6"
    />
    <ellipse
      cx="200"
      cy="200"
      opacity="0.12"
      rx="180"
      ry="80"
      stroke="currentColor"
      strokeWidth="0.6"
    />
    <ellipse
      cx="200"
      cy="200"
      opacity="0.12"
      rx="180"
      ry="120"
      stroke="currentColor"
      strokeWidth="0.6"
    />
    <ellipse
      cx="200"
      cy="200"
      opacity="0.1"
      rx="180"
      ry="155"
      stroke="currentColor"
      strokeWidth="0.6"
    />

    {/* Longitude meridians */}
    <ellipse
      cx="200"
      cy="200"
      opacity="0.12"
      rx="40"
      ry="180"
      stroke="currentColor"
      strokeWidth="0.6"
    />
    <ellipse
      cx="200"
      cy="200"
      opacity="0.12"
      rx="80"
      ry="180"
      stroke="currentColor"
      strokeWidth="0.6"
    />
    <ellipse
      cx="200"
      cy="200"
      opacity="0.12"
      rx="120"
      ry="180"
      stroke="currentColor"
      strokeWidth="0.6"
    />
    <ellipse
      cx="200"
      cy="200"
      opacity="0.1"
      rx="155"
      ry="180"
      stroke="currentColor"
      strokeWidth="0.6"
    />

    {/* Equator */}
    <line
      opacity="0.15"
      stroke="currentColor"
      strokeWidth="0.6"
      x1="20"
      x2="380"
      y1="200"
      y2="200"
    />
    {/* Prime meridian */}
    <line
      opacity="0.15"
      stroke="currentColor"
      strokeWidth="0.6"
      x1="200"
      x2="200"
      y1="20"
      y2="380"
    />

    {/* Africa continent outline — horn, west bulge, cape */}
    <path
      d="M195,105 L200,102 C205,100 210,100 215,102 L220,105 C224,108 227,113 229,120 L231,128 C233,136 234,145 233,153 L232,162 C231,168 229,175 226,182 L224,188 C222,194 221,200 220,206 L219,212 C218,220 219,228 221,235 L223,240 C225,244 228,248 231,252 L234,256 C232,260 228,263 224,265 L219,268 C214,270 209,272 204,273 L200,274 C196,273 194,271 192,267 L190,262 C188,256 184,251 180,246 L176,240 C174,236 172,230 171,224 L170,216 C170,208 172,200 174,193 L177,186 C179,180 180,174 181,168 L182,160 C182,152 183,144 184,137 L186,130 C188,123 190,116 193,110 L195,105Z"
      fill="currentColor"
      fillOpacity="0.06"
      opacity="0.35"
      stroke="currentColor"
      strokeWidth="1.2"
    />

    {/* Madagascar */}
    <path
      d="M238,235 C240,232 243,231 245,233 L247,237 C248,242 247,248 244,252 L241,254 C239,253 237,250 237,246 L237,240 C237,238 237,236 238,235Z"
      fill="currentColor"
      fillOpacity="0.04"
      opacity="0.2"
      stroke="currentColor"
      strokeWidth="0.7"
    />

    {/* Europe — UK, Scandinavia, mainland */}
    <path
      d="M185,82 C188,78 193,76 199,75 L206,74 C212,74 217,76 221,80 L225,84 C228,88 230,92 229,97 L227,103 C225,108 221,111 216,112 L210,113 C206,113 202,112 198,110 L193,106 C190,102 187,97 186,92 L185,87 C185,85 185,83 185,82Z"
      fill="currentColor"
      fillOpacity="0.05"
      opacity="0.28"
      stroke="currentColor"
      strokeWidth="1"
    />

    {/* British Isles */}
    <path
      d="M174,80 C176,77 180,76 183,78 L185,81 C186,84 185,88 182,90 L179,91 C176,90 174,87 174,84 L174,80Z"
      fill="currentColor"
      fillOpacity="0.04"
      opacity="0.22"
      stroke="currentColor"
      strokeWidth="0.7"
    />

    {/* Greenland/Iceland area */}
    <path
      d="M140,55 C146,52 154,51 160,53 L165,56 C168,59 169,64 167,68 L163,72 C158,74 152,74 147,72 L143,68 C140,64 139,59 140,55Z"
      fill="currentColor"
      fillOpacity="0.03"
      opacity="0.18"
      stroke="currentColor"
      strokeWidth="0.7"
    />

    {/* North America — visible left portion */}
    <path
      d="M88,95 C94,88 104,83 115,80 L128,78 C138,77 148,80 155,85 L162,92 C167,98 170,105 171,113 L172,122 C172,132 168,142 163,150 L157,157 C152,162 145,166 138,168 L128,170 C120,170 112,168 105,163 L97,157 C91,151 87,143 85,134 L83,123 C82,112 84,102 88,95Z"
      fill="currentColor"
      fillOpacity="0.04"
      opacity="0.25"
      stroke="currentColor"
      strokeWidth="1"
    />

    {/* Central America bridge */}
    <path
      d="M130,170 C134,172 137,176 139,181 L140,188 C140,194 138,199 135,203 L132,206 C129,208 126,207 124,204 L122,198 C121,192 122,185 125,179 L128,174 C129,172 129,171 130,170Z"
      fill="currentColor"
      fillOpacity="0.03"
      opacity="0.2"
      stroke="currentColor"
      strokeWidth="0.7"
    />

    {/* South America */}
    <path
      d="M132,210 C136,206 142,204 148,204 L154,206 C158,209 161,214 163,220 L165,228 C166,238 164,248 160,256 L156,263 C152,268 147,272 141,274 L137,274 C133,273 130,270 128,266 L125,258 C123,250 122,240 123,230 L124,222 C125,216 128,213 132,210Z"
      fill="currentColor"
      fillOpacity="0.04"
      opacity="0.25"
      stroke="currentColor"
      strokeWidth="1"
    />

    {/* Arabian Peninsula */}
    <path
      d="M238,140 C242,137 247,136 252,138 L257,142 C260,147 261,153 259,158 L256,164 C252,168 248,170 243,169 L239,166 C236,162 234,156 234,150 L235,144 C236,142 237,141 238,140Z"
      fill="currentColor"
      fillOpacity="0.04"
      opacity="0.22"
      stroke="currentColor"
      strokeWidth="0.8"
    />

    {/* India subcontinent */}
    <path
      d="M270,148 C274,145 279,144 283,146 L286,150 C288,155 288,162 286,168 L282,174 C278,178 274,178 270,175 L268,170 C266,164 266,156 268,150 L270,148Z"
      fill="currentColor"
      fillOpacity="0.04"
      opacity="0.2"
      stroke="currentColor"
      strokeWidth="0.7"
    />

    {/* Asia — large mass right side */}
    <path
      d="M245,78 C254,72 266,69 278,72 L290,76 C300,82 308,90 313,100 L317,112 C320,122 320,132 317,142 L313,150 C308,157 300,162 292,164 L280,166 C270,166 260,162 252,156 L246,148 C242,142 240,134 239,125 L238,114 C238,102 240,90 245,78Z"
      fill="currentColor"
      fillOpacity="0.04"
      opacity="0.22"
      stroke="currentColor"
      strokeWidth="1"
    />

    {/* Japan archipelago */}
    <path
      d="M322,98 C324,95 327,94 329,96 L331,100 C332,105 331,110 328,114 L325,116 C323,115 321,112 321,108 L321,102 C321,100 322,99 322,98Z"
      fill="currentColor"
      fillOpacity="0.03"
      opacity="0.18"
      stroke="currentColor"
      strokeWidth="0.6"
    />

    {/* Southeast Asia / Indonesia */}
    <path
      d="M298,175 C302,173 308,173 312,176 L315,180 C316,184 314,188 310,190 L304,191 C300,190 296,187 295,183 L296,178 C296,176 297,175 298,175Z"
      fill="currentColor"
      fillOpacity="0.03"
      opacity="0.18"
      stroke="currentColor"
      strokeWidth="0.6"
    />

    {/* Australia */}
    <path
      d="M296,242 C304,238 314,236 322,240 L328,246 C332,252 334,260 332,268 L328,276 C322,282 314,284 306,282 L298,278 C292,274 288,266 287,258 L288,250 C290,246 292,244 296,242Z"
      fill="currentColor"
      fillOpacity="0.03"
      opacity="0.2"
      stroke="currentColor"
      strokeWidth="0.8"
    />

    {/* Scattered language-node dots across continents */}
    {[
      [200, 135, 0.4],
      [215, 185, 0.45],
      [210, 240, 0.35],
      [195, 265, 0.3],
      [110, 100, 0.3],
      [150, 150, 0.25],
      [140, 230, 0.28],
      [148, 255, 0.22],
      [265, 85, 0.22],
      [290, 110, 0.2],
      [310, 255, 0.2],
      [250, 150, 0.25],
      [95, 95, 0.2],
      [280, 75, 0.18],
      [325, 105, 0.16],
      [175, 83, 0.18],
      [275, 160, 0.2],
      [305, 180, 0.15],
    ].map(([cx, cy, o], i) => (
      <circle key={i} cx={cx} cy={cy} fill="currentColor" opacity={o} r="2" />
    ))}
  </svg>
);

export default Globe;
