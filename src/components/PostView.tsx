import { type RouterOutputs } from "~/utils/api";
import Image from "next/image";
import Link from "next/link";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

type PostWithUser = RouterOutputs["posts"]["getAll"][number];
export const PostView = (props: PostWithUser) => {
  const { post, author } = props;
  return (
    <div
      className="flex gap-3 border-b border-slate-400 p-4 transition duration-300 ease-in-out hover:bg-neutral-950"
      key={post.id}
    >
      <Image
        className="h-14 w-14 rounded-full"
        src={author.profileImageUrl}
        alt={`@${author.username}'s profile picture`}
        width="56"
        height="56"
      />
      <div className="flex flex-col gap-1 text-slate-300">
        <div className="flex text-slate-300">
          <Link
            className="underline-offset-2 hover:underline"
            href={`/@${author.username}`}
          >
            <span>{`@${author.username}`}</span>
          </Link>
          <Link href={`/post/${post.id}`}>
            {" "}
            <span className="font-thin">
              &nbsp;·&nbsp;{dayjs(post.createdAt).fromNow()}
            </span>
          </Link>
        </div>
        <span className="text-2xl">{post.content}</span>
      </div>
    </div>
  );
};
