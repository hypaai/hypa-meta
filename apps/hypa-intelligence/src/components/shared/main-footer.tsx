// @ts-nocheck
import {
  CONTACT_US_LINK,
  ABOUT_US_LINK,
} from "@/constants/app.constants";

const MainFooter = () => {
  return (
    <footer className="sticky bottom-0 z-30 px-4 md:px-6 py-4 border-t bg-background/80 supports-[backdrop-filter]:bg-background/60 backdrop-blur">
      <div className="mx-auto max-w-7xl flex justify-between">
        <a
          className="text-xs text-muted-foreground hover:underline"
          href={ABOUT_US_LINK}
          rel="noreferrer"
          target="_blank"
        >
          About Us
        </a>
        <a
          className="text-xs text-muted-foreground hover:underline"
          href={CONTACT_US_LINK}
          rel="noreferrer"
          target="_blank"
        >
          Contact Us
        </a>
      </div>
    </footer>
  );
};

export default MainFooter;
