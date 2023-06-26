import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";

// PROFILE PAGE

type ProfilePageProps = {
  username: string;
};

const ProfilePage: NextPage<ProfilePageProps> = (props) => {
  const { data, isLoading } = api.profile.getUserByUsername.useQuery({
    username: props.username,
  });

  if (!data) {
    return <div>404</div>;
  }

  const username = data.username ?? "Unknown";

  // TODO: Do I want to auth for profile pages?
  // const { user, isLoaded: userLoaded, isSignedIn } = useUser();

  // // Return empty div if user isn't loaded
  // if (!userLoaded) return <div />;

  return (
    <>
      <Head>
        <title>{`${username}'s Profile`}</title>
      </Head>
      <main className="flex h-screen justify-center">
        <div>{data.username}</div>
      </main>
    </>
  );
};

import { createServerSideHelpers } from "@trpc/react-query/server";
import superjson from "superjson";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";

// this function means it will be treated mostly as a static asset
export const getStaticProps: GetStaticProps = async (context) => {
  const helpers = createServerSideHelpers({
    router: appRouter,
    ctx: { prisma, userId: null },
    transformer: superjson, // optional - adds superjson serialization
  });

  const slug = context.params?.slug;

  if (typeof slug !== "string") throw new Error("slug is not correct");

  const username = slug.replace("@", "");
  // server pay fetch karkay rakho
  await helpers.profile.getUserByUsername.prefetch({ username });

  return {
    props: {
      trpcState: helpers.dehydrate(), // this let's the data be prefetched on the server so it's available immediately, so loading state is never hit
      username,
    },
  };
};

export const getStaticPaths = () => {
  return {
    paths: [], // any path that is returned here will be pre-rendered
    // fallback: blocking means that if the path is not returned here, it will be generated on the server and cached for future requests
    // fallback: true, means that Nextjs will serve a fallback page on the first request, then generate the page in the background and cache it for future requests
    fallback: "blocking",
  };
};

// the store data here will only change if userprofileimage changes that we can trigger with serverside update, this page will be static i.e. never change!
export default ProfilePage;
