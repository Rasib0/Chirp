import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import Image from "next/image";
import { LoadingSpinner } from "~/components/loading";
import { PostView } from "~/components/PostView";
import { PageLayout } from "~/components/layout";

// PROFILE PAGE

type ProfilePageProps = {
  username: string;
};

const ProfileFeed = (props: {
  author: {
    username: string;
    profileImageUrl: string;
    id: string;
  };
}) => {
  const { data, isLoading } = api.posts.getPostByAuthorId.useQuery({
    authorId: props.author.id,
  });

  if (isLoading)
    return (
      <div>
        <LoadingSpinner />
      </div>
    );

  if (!data || data.length === 0)
    return <div>User hasn&apos;t posted yet.</div>;

  return (
    <article className="flex flex-col">
      {data.map((post) => (
        <PostView key={post.id} post={post} author={props.author} />
      ))}
    </article>
  );
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
      <PageLayout>
        {/* Profile Image and background */}
        <div className="relative h-48 border-slate-400 bg-slate-600">
          <Image
            src={data.profileImageUrl}
            alt={`${username}'s Profile Image`}
            width={160}
            height={160}
            className="absolute bottom-0 left-0 -mb-20 ml-4 rounded-full border-[5px] border-black bg-black"
          />
        </div>
        <div className="h-20"></div>
        {/* Info Box */}
        <div className="px-10 py-4 text-2xl font-bold">@{data.username}</div>
        <div className="w-full border-b border-slate-400"></div>
      </PageLayout>
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
