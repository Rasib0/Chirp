import type { GetStaticProps, NextPage } from "next";
import Head from "next/head";
import { api } from "~/utils/api";
import Image from "next/image";
import { LoadingFeed } from "~/components/loading";
import { PostView } from "~/components/postview";
import { PageLayout } from "~/components/layout";

// PROFILE PAGE

type ProfilePageProps = {
  username: string;
};

const ProfileFeed = (props: { authorId: string }) => {
  const { data, isLoading } = api.posts.getPostsByAuthorId.useQuery({
    authorId: props.authorId,
  });

  if (isLoading) return <LoadingFeed />;

  if (!data || data.length === 0)
    return <div>User hasn&apos;t posted yet.</div>;

  return (
    <article className="flex flex-col">
      {data.map((fullPost) => (
        <PostView key={fullPost.post.id} {...fullPost} />
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
        <header className="sticky top-0 z-10 border-b border-slate-700 bg-opacity-5 p-4 backdrop-blur-md">
          <div className="justify-left flex items-center text-xl font-bold text-white">
            <Link href="/">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="inline-block h-8 w-8 cursor-pointer rounded-full p-1 transition duration-100 ease-in-out hover:bg-neutral-800 hover:bg-opacity-50"
                fill="none"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M11.7071 4.29289C12.0976 4.68342 12.0976 5.31658 11.7071 5.70711L6.41421 11H20C20.5523 11 21 11.4477 21 12C21 12.5523 20.5523 13 20 13H6.41421L11.7071 18.2929C12.0976 18.6834 12.0976 19.3166 11.7071 19.7071C11.3166 20.0976 10.6834 20.0976 10.2929 19.7071L3.29289 12.7071C3.10536 12.5196 3 12.2652 3 12C3 11.7348 3.10536 11.4804 3.29289 11.2929L10.2929 4.29289C10.6834 3.90237 11.3166 3.90237 11.7071 4.29289Z"
                  fill="#FFFFFF"
                />
              </svg>
            </Link>
            <span className="ml-2">Home</span>
          </div>
        </header>
        {/* Profile Image and background */}
        <div className="relative h-48 border-slate-700 bg-slate-600">
          <Image
            src={data.profileImageUrl}
            alt={`${username}'s Profile Image`}
            width={160}
            height={160}
            className="absolute bottom-0 left-0 -mb-20 ml-4 h-40 w-40 overflow-hidden rounded-full border-[5px] border-black bg-black"
          />
        </div>
        <div className="h-20"></div>
        {/* Info Box */}
        <div className="px-10 py-4 text-2xl font-bold">@{data.username}</div>
        <div className="w-full border-b border-slate-700"></div>
        <ProfileFeed authorId={data.id} />
      </PageLayout>
    </>
  );
};

import { createServerSideHelpers } from "@trpc/react-query/server";
import superjson from "superjson";
import { appRouter } from "~/server/api/root";
import { prisma } from "~/server/db";
import Link from "next/link";

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
