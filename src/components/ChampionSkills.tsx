export function ChampionSkills(props) {
  console.log("🚀 ~ props", props)

  const displayedSkillInfo = [
    "targeting",
    "affects",
    "spellShieldable",
    "resource",
    "damageType",
    "spellEffects",
    "projectile",
    "onHitEffects",
    "missileSpeed",
    "rechargeRate",
    "collisionRadius",
    "tetherRadius",
    "onTargetCdStatic",
    "innerRadius",
    "speed",
    "width",
    "angle",
    "castTime",
    "effectRadius",
    "targetRange",
  ]

  function createSkillELement(skillKey) {
    return props.abilities[skillKey].map((skill) => {
      return (
        <div style={{ border: "1px solid" }}>
          <div
            style={{
              display: "flex",
            }}
          >
            <img
              src={skill.icon}
              alt={skill.name}
              style={{ objectFit: "cover", width: "80px", height: "80px" }}
              className="champion-info__image"
            />
            <div>
              <div>{skill.name}</div>
              <div>{skill.description}</div>
              <div>
                {skill.effects.map((effect) => {
                  return (
                    <div>
                      {" "}
                      <p>{effect.description}</p>
                      {effect.leveling.map(({ attribute, modifiers }) => {
                        return (
                          <>
                            <p>{attribute}</p>
                            <div>
                              {modifiers.map((modifier, index) => {
                                if (index === 0)
                                  return (
                                    <p>
                                      {modifier.values.join(" / ")}{" "}
                                      {modifier.units[0]}
                                    </p>
                                  )
                                else
                                  return (
                                    <p>
                                      (+{modifier.values.join(" / ")}
                                      {modifier.units[0]})
                                    </p>
                                  )
                              })}
                            </div>
                          </>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
          <div style={{ border: "1px solid black" }}>
            <h5>Info:</h5>
            {displayedSkillInfo.map((infoKey) => {
              return (
                skill[infoKey] && (
                  <p>
                    {infoKey.replace(/([a-z])([A-Z])/g, "$1 $2").toUpperCase()}:{" "}
                    {skill[infoKey]}
                  </p>
                )
              )
            })}
            <div>
              {skill.cooldown && (
                <>
                  <h6>
                    Cooldown:{" "}
                    {skill.cooldown.modifiers.map((modifier) => {
                      return <>{modifier.values.join(" / ")}</>
                    })}
                  </h6>
                  <p>
                    Does Ability Haste affect the cooldown?{" "}
                    {skill.cooldown.affectedByCdr ? (
                      <span>Yes</span>
                    ) : (
                      <span>No</span>
                    )}
                  </p>
                </>
              )}
            </div>
            <div>
              {skill.cost && (
                <>
                  <h6>
                    Cost: ''
                    {skill.cost.modifiers.map((modifier) => {
                      return <>{modifier.values.join(" / ")}</>
                    })}
                  </h6>
                </>
              )}
            </div>
          </div>
        </div>
      )
    })
  }

  return (
    <div>
      <div>Passive:</div>
      {createSkillELement("P")}
      <div>Q:</div>
      {createSkillELement("Q")}
      <div>W:</div>
      {createSkillELement("W")}
      <div>E:</div>
      {createSkillELement("E")}
      <div>R:</div>
      {createSkillELement("R")}
    </div>
  )
}
