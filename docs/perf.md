# Claudov performance capture

Serve the built game over HTTP and open `index.html#bench` in Chromium on the target laptop. Choose the desired window size first. Click **Run all qualities** and keep the tab visible. The capture starts with your configured quality and visits every quality once, including Auto. Allow at least seven and a half minutes for the five 90-second passes, plus map loading.

Send back the **Download JSON report** file and the laptop's GPU, power mode and browser version. The target is 60 frames per second at the intended gameplay settings on a mid-range laptop, equivalent to a 16.67 ms frame budget. Use the median and 1% low together to spot hitches.

The report includes CPU stages from the existing recorder, separate WebGL shadow and render measurements when supported, draw calls, triangles, and JavaScript heap endpoints. GPU values outside the timed shadow and render stages and unsupported browser counters appear as null. The separate shadow query runs only during the benchmark. A headless smoke can check route traversal and schema, but meaningful performance comparisons require the laptop.
