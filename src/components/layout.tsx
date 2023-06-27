import type { PropsWithChildren } from "react";

export const PageLayout = (props: PropsWithChildren) => {
  return (
    <main className="flex justify-center">
      <div className="h-full min-h-screen w-full border-x border-slate-400 md:max-w-2xl">
        {props.children}
      </div>
    </main>
  );
};
