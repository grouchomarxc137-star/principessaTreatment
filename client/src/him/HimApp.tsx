import { History } from "../History.tsx";
import { useRouter } from "../router.tsx";
import { useAppState } from "../store.tsx";
import { TabBar, Toast } from "../ui/Chrome.tsx";
import { HimHome } from "./HimHome.tsx";
import { More } from "./More.tsx";
import { Mystery } from "./Mystery.tsx";
import { Offer } from "./Offer.tsx";

export function HimApp() {
  const { path } = useRouter();
  const s = useAppState();

  let screen;
  if (path === "/offer") screen = <Offer />;
  else if (path === "/mystery") screen = <Mystery />;
  else if (path === "/more") screen = <More />;
  else if (path === "/history") screen = <History back="/more" />;
  else screen = <HimHome />;

  return (
    <>
      {screen}
      <TabBar
        tabs={[
          { to: "/", label: "Her", dot: path !== "/" && s.active.some((r) => !r.response) },
          { to: "/offer", label: "Offer" },
          { to: "/mystery", label: "Mystery" },
          { to: "/more", label: "More" },
        ]}
      />
      <Toast />
    </>
  );
}
