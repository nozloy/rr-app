import Image from "next/image";

export function RaidCheckScenery() {
  return (
    <>
      <div className="raid-workshop-scenery" aria-hidden="true">
        <Image className="raid-workshop-environment" src="/raidcheck/workshop/environment.webp" alt="" width={1672} height={941} sizes="100vw" quality={95} priority />
      </div>
      <Image className="raid-workshop-crates" src="/raidcheck/workshop/crates.webp" alt="" width={1448} height={1086} sizes="(max-width: 700px) 180px, 30vw" quality={95} />
    </>
  );
}
