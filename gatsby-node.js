const axios = require("axios")

// Exports as sourceNodes for gatsby to store in GraphQL
exports.sourceNodes = async ({
  actions,
  createNodeId,
  createContentDigest,
}) => {

  // getting all satellites from the observatory
  const observatories = await axios({
    method: "GET",
    url: "https://sscweb.sci.gsfc.nasa.gov/WS/sscr/2/observatories",
    headers: {
      Accept: "application/json",
    },
  }).catch(error => {
    console.error("observatories GET error: ", error.message)
  })

    // takes in resourceId to get more information about satellite
  const getDetails = async resId => {
    const details = await axios({
      method: "GET",
      url: `https://cdaweb.gsfc.nasa.gov/registry/hdp/Spase.xql?id=${resId}`,
      headers: {
        Accept: "application/json",
      },
    })

    const isObservatoryRegionNull = details.data.Location
      ? details.data.Location.ObservatoryRegion
      : null
    const observatoryRegion = Array.isArray(isObservatoryRegionNull)
      ? isObservatoryRegionNull
      : [isObservatoryRegionNull]

    return {
      description: details.data.ResourceHeader.Description,
      releaseDate: details.data.ResourceHeader.ReleaseDate,
      alternateNames: details.data.ResourceHeader.AlternateName,
      info: {
        ...details.data.ResourceHeader.InformationURL,
      },
      observatoryRegion: observatoryRegion,
    }
  }

  const promise1 = new Promise((resolve, reject) => {
    observatories.data.Observatory[1].forEach(satellites => {
      // iterates over each satellite to get details and returns via promise
      const {
        Id,
        EndTime,
        Name,
        StartTime,
        Resolution,
        ResourceId,
      } = satellites
      // console.log({ ResourceId, Resolution, StartTime, EndTime, Name, Id })
      // console.log({ Name })
      const hasResourceId = ResourceId ? ResourceId : null

      if (hasResourceId) {
        const details = getDetails(hasResourceId)
        // console.log({ details })
        // https://nssdc.gsfc.nasa.gov/thumbnail/spacecraft/ace1.gif
        if (details) {
          details
            .then(result => {
              const node = {
                nameID: Id,
                resolution: Resolution,
                endTime: EndTime[1],
                startTime: StartTime[1],
                name: Name,
                resourceId: ResourceId,
                details: result,
                id: createNodeId(satellites.Id),
                internal: {
                  type: "satellite",
                  contentDigest: createContentDigest(satellites),
                },
              }
              actions.createNode(node)

              if (result) resolve()
            })
            .catch(error => {
              console.log("details error:", error)
              reject()
            })
        }
      }
    })
    resolve()
    return promise1
  })
  return promise1
}
