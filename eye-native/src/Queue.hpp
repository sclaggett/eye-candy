#pragma once

#include <condition_variable>
#include <queue>
#include <mutex>

template <typename T>
class Queue
{
public:
  Queue() {};
  virtual ~Queue() {};

public:
  void addItem(T item);
  bool waitItem(T* item, int timeout);
  std::vector<T> waitAllItems(int timeout);

  int size();
  bool empty();
  void clear();

protected:
  std::queue<T> itemQueue;
  std::mutex queueMutex;
  std::condition_variable queueEvent;
};

template <typename T>
void Queue<T>::addItem(T item)
{
  {
    std::unique_lock<std::mutex> lock(queueMutex);
    itemQueue.push(item);
  }
  queueEvent.notify_all();
}

template <typename T>
bool Queue<T>::waitItem(T* item, int timeout)
{
  std::unique_lock<std::mutex> lock(queueMutex);
  if (itemQueue.empty() && (timeout > 0))
  {
    queueEvent.wait_for(lock, std::chrono::milliseconds(timeout));
  }
  if (itemQueue.empty())
  {
    return false;
  }
  *item = itemQueue.front();
  itemQueue.pop();
  return true;
}

template <typename T>
std::vector<T> Queue<T>::waitAllItems(int timeout)
{
  std::unique_lock<std::mutex> lock(queueMutex);
  if (itemQueue.empty() && (timeout > 0))
  {
    queueEvent.wait_for(lock, std::chrono::milliseconds(timeout));
  }
  std::vector<T> allItems;
  while (!itemQueue.empty())
  {
    T item = itemQueue.front();
    itemQueue.pop();
    allItems.push_back(item);
  }
  return allItems;
}

template <typename T>
int Queue<T>::size()
{
  std::unique_lock<std::mutex> lock(queueMutex);
  return itemQueue.size();
}

template <typename T>
bool Queue<T>::empty()
{
  return (size() == 0);
}

template <typename T>
void Queue<T>::clear()
{
  std::unique_lock<std::mutex> lock(queueMutex);
  while (!itemQueue.empty())
  {
    itemQueue.pop();
  }
}
