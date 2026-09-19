import { History } from "../History.tsx";
import { useRouter } from "../router.tsx";
import { useAppState } from "../store.tsx";
import { TabBar, Toast } from "../ui/Chrome.tsx";
import { Deck } from "./Deck.tsx";
import { HerHome } from "./HerHome.tsx";
import { HerOffers } from "./HerOffers.tsx";
import { Me } from "./Me.tsx";
import { MyCards } from "./MyCards.tsx";
import { Wishes } from "./Wishes.tsx";

export function HerApp() {
  const { path } = useRouter();
  const state = useAppState();

  let screen;
  if (path === "/deck") screen = <Deck />;
  else if (path === "/offers") screen = <HerOffers />;
  else if (path === "/me/cards") screen = <MyCards />;
  else if (path === "/me/wishes") screen = <Wishes />;
  else if (path === "/me") screen = <Me />;
  else if (path === "/history") screen = <History back="/me" />;
  else screen = <HerHome />;

  return (
    <>
      {screen}
      <TabBar
        tabs={[
          { to: "/", label: "Home" },
          { to: "/offers", label: "Offers", dot: state.offers.length > 0 },
          { to: "/me", label: "Me" },
        ]}
      />
      <Toast />
    </>
  );
}
