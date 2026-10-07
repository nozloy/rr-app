import Image from "next/image";

/** The environment is decorative; it never determines the size of the UI. */
export function WorkshopEnvironment() {
  return (
    <div className="workshop-environment" aria-hidden="true">
      <div className="workshop-environment-art">
        <Image src="/home/workshop/environment.webp" alt="" width={1672} height={941} priority unoptimized className="workshop-environment-center" />
        <div className="workshop-environment-side-wrap">
          <Image src="/home/workshop/workshop-wall.webp" alt="" width={1086} height={1448} unoptimized className="workshop-environment-side workshop-environment-left" />
        </div>
        <div className="workshop-environment-side-wrap">
          <Image src="/home/workshop/carnival-wall.webp" alt="" width={1086} height={1448} unoptimized className="workshop-environment-side workshop-environment-right" />
        </div>
      </div>
      <div className="workshop-environment-shade" />
    </div>
  );
}
