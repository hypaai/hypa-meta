import { Outlet } from "@/react-router-compat";
import { useLocation } from "react-router-dom";
import FooterSection from "@/components/modules/dictionary/footer-section";

const MainLayout = () => {
  const { pathname } = useLocation();
  const hideFooter = pathname === "/dictionary/settings";

  return (
    <div className="flex-1 flex flex-col relative bg-[var(--background)] w-full">
      <main className="flex-1">
        <Outlet />
      </main>
      {!hideFooter && <FooterSection />}
    </div>
  );
};

export default MainLayout;
