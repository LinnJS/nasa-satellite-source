const axios = require("axios")

exports.sourceNodes = async ({
                               actions,
                               createNodeId,
                               createContentDigest,
                             }) => {
  const observatories = await axios({
    method: "GET",
    url: "https://sscweb.sci.gsfc.nasa.gov/WS/sscr/2/observatories",
    headers: {
      Accept: "application/json",
    },
  }).catch(error => {
    console.error("observatories GET error: ", error.message)
  })

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

  const promise1 = new Promise(resolve => {
    observatories.data.Observatory[1].forEach(satellites => {
      const {
        Id,
        EndTime,
        Name,
        StartTime,
        Resolution,
        ResourceId,
      } = satellites

      if (ResourceId) {
        const details = getDetails(ResourceId)
        if (details) {
          details.then(res => {
            const node = {
              nameID: Id,
              resolution: Resolution,
              endTime: EndTime[1],
              startTime: StartTime[1],
              name: Name,
              resourceId: ResourceId,
              details: res,
              id: createNodeId(satellites.Id),
              internal: {
                type: "satellite",
                contentDigest: createContentDigest(satellites),
              },
            }

            actions.createNode(node)
            if (res.description) resolve()
          })
        }
      }
    })
  })
  return Promise.all([promise1])
}
