import Image from "next/image";

export function WorkshopScenery() {
  return (
    <>
      <div className="workshop-scenery workshop-scenery-goblin" aria-hidden="true">
        <Image src="/home/workshop/goblin.webp" alt="" width={1122} height={1402} unoptimized />
      </div>
      <div className="workshop-scenery workshop-scenery-oracle" aria-hidden="true">
        <Image src="/home/workshop/oracle-prop.webp" alt="" width={1086} height={1448} unoptimized />
      </div>
    </>
  );
}
