const app = Vue.createApp({
  data() {
    return {
      // list of hardware from {apiurl}/hardware
      hardware: [],
      // list of current errors (for last octomization run)
      errors: [],
      // api url
      api_url: "http://netheria.takehome.octoml.ai/",
    };
  },
  created() {
    //get hardware when created, so we can have that data immediately
    fetch(this.api_url + "hardware")
      .then((res) => res.json())
      .then((data) => {
        this.hardware = data;
      })
      .catch((err) => {
        console.error("Error fetching /hardware", err);
      });
  },
  methods: {
    /** Handles clearing errors when we change our current targets (since errors won't match up to the targets anymore, necessarily). */
    handleTargetsChanged() {
      this.errors = [];
    },
    /** Helper to post a payload to an endpoint */
    async getPostResult(endpoint, payload) {
      // create fetch options for POST
      const options = {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      };

      // return result
      return await fetch(this.api_url + endpoint, options)
        .then((res) => {
          console.log("got res from post to /" + endpoint, res);
          return res.status == 200; // true if success, false if not
        })
        .catch((err) => {
          console.error("Error posting to /" + endpoint, err);
          return false; // always false if error occurred
        });
    },
    /** Helper function to handle running all the necessary payload POST requests. */
    async handleStartRuns(payloads) {
      this.errors = []; // clear errors

      // hold results for benchmarks and accelerations
      let b_results = [];
      let a_results = [];

      // run all benchmark payloads
      if (payloads.benchmark) {
        for (let payload of payloads.benchmark) {
          const result = await this.getPostResult("benchmark", payload);
          b_results.push(result);
        }
      }

      // run all accelerate payloads
      if (payloads.accelerate) {
        for (let payload of payloads.accelerate) {
          const result = await this.getPostResult("accelerate", payload);
          a_results.push(result);
        }
      }

      // compile all results for all targets
      let results = [];

      // if we have both accel and bench results, check that each target passed both types
      if (b_results.length > 0 && a_results.length > 0) {
        for (let ind in b_results) {
          results.push( b_results[ind] && a_results[ind] )
        }
      } else if (b_results.length > 0) {
        // if only bench results, return those results as errors
        results = b_results;
      } else {
        results = a_results;
      }

      // set errors to results
      this.errors = results;

      // notify the user asyncronously
      setTimeout(() => {
        this.handleNotifyUser(results);
      }, 10);
    },
    /** Notifies the user depending on the results of the tests. */
    async handleNotifyUser(results) {
      if (results.includes(false)) {
        alert("Error running targets!");
      } else {
        alert("Success! All targets ran without errors.");
      }
    },
  },
});
